import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchProducts } from '../api.js';
import { filtersKey } from '../filters.js';

const EMPTY = {
  key: null, // filtersKey the items below belong to
  items: [],
  page: 0, // last page loaded for `key`
  total: null,
  totalPages: null,
  facets: null,
  loading: true,
  error: null,
};

function mergeById(prev, next) {
  const seen = new Set(prev.map((p) => p.id));
  const out = [...prev];
  for (const p of next) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

/**
 * Paged, filtered product search for infinite scroll.
 *
 * - Any change to the filters (including sort) starts again at page 1.
 * - Only one request is in flight; starting a new one aborts the previous one, and a
 *   response that is not from the latest request is ignored, so a late page never shows.
 * - While page 1 of a new filter set loads, the previous results stay visible (`stale`).
 * - On a 400 with error.details, `onInvalidParams(details)` is called once; if it returns
 *   true (it changed the filters) the new filters are fetched instead of showing the error.
 *   Another automatic fix is allowed only after a successful response.
 */
export function useProductSearch(filters, { pageSize = 12, onInvalidParams } = {}) {
  const key = filtersKey(filters);
  const [state, setState] = useState(EMPTY);

  const latest = useRef({ filters, key, state, onInvalidParams });
  latest.current = { filters, key, state, onInvalidParams };
  const inFlight = useRef(null); // AbortController of the current request
  const autoFixed = useRef(false);

  const request = useCallback(
    async (page) => {
      const { filters: forFilters, key: forKey } = latest.current;
      inFlight.current?.abort();
      const ctrl = new AbortController();
      inFlight.current = ctrl;
      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const data = await fetchProducts({ page, limit: pageSize, filters: forFilters, signal: ctrl.signal });
        if (inFlight.current !== ctrl) return;
        inFlight.current = null;
        autoFixed.current = false;
        setState((s) => ({
          key: forKey,
          items: mergeById(page === 1 ? [] : s.items, data.items),
          page: data.page,
          total: data.total,
          totalPages: data.totalPages,
          facets: data.facets,
          loading: false,
          error: null,
        }));
      } catch (err) {
        if (inFlight.current !== ctrl) return; // aborted or superseded
        inFlight.current = null;
        const fix = latest.current.onInvalidParams;
        if (page === 1 && err.status === 400 && err.details?.length && fix && !autoFixed.current) {
          autoFixed.current = true;
          if (fix(err.details)) return; // filters changed; the effect below fetches them
        }
        setState((s) =>
          page === 1
            ? { ...EMPTY, key: forKey, facets: s.facets, loading: false, error: err }
            : { ...s, loading: false, error: err }
        );
      }
    },
    [pageSize]
  );

  // Page 1 whenever the filters change.
  useEffect(() => {
    request(1);
  }, [key, request]);

  // Abort on unmount.
  useEffect(() => () => inFlight.current?.abort(), []);

  const loadMore = useCallback(() => {
    const { state: s, key: k } = latest.current;
    if (inFlight.current || s.key !== k || s.error || s.totalPages == null || s.page >= s.totalPages) return;
    request(s.page + 1);
  }, [request]);

  const retry = useCallback(() => {
    const { state: s, key: k } = latest.current;
    if (inFlight.current) return;
    request(s.key === k && s.page > 0 ? s.page + 1 : 1);
  }, [request]);

  const stale = state.key !== key;
  return {
    items: state.items,
    total: stale ? null : state.total,
    facets: state.facets,
    loading: state.loading,
    error: state.error,
    stale,
    hasMore: !stale && state.totalPages != null && state.page < state.totalPages,
    loadMore,
    retry,
  };
}
