import { useCallback, useEffect, useState } from 'react';
import { parseFilters, toSearchParams } from '../filters.js';

function currentUrl() {
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}`;
}

function writeUrl(filters, replace) {
  const qs = toSearchParams(filters).toString();
  const { pathname, hash } = window.location;
  const url = `${pathname}${qs ? `?${qs}` : ''}${hash}`;
  if (url === currentUrl()) return;
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
}

/**
 * Filters and sort live in the page URL (no router needed for a single page).
 * setFilters pushes a history entry, so Back/Forward step through filter states;
 * pass { replace: true } for automatic corrections that shouldn't add one.
 */
export function useUrlFilters() {
  const [filters, setState] = useState(() => parseFilters(window.location.search));

  useEffect(() => {
    // Rewrite a hand-edited or shared URL into its canonical form.
    writeUrl(parseFilters(window.location.search), true);
    const onPopState = () => setState(parseFilters(window.location.search));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const setFilters = useCallback((next, { replace = false } = {}) => {
    writeUrl(next, replace);
    setState(next);
  }, []);

  return [filters, setFilters];
}
