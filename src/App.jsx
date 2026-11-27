import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_FILTERS, countActive, removeRejected } from './filters.js';
import { useUrlFilters } from './hooks/useUrlFilters.js';
import { useProductSearch } from './hooks/useProductSearch.js';
import FilterPanel from './components/FilterPanel.jsx';
import SortSelect from './components/SortSelect.jsx';
import ProductCard from './components/ProductCard.jsx';

const PAGE_SIZE = 12;

function describeRejected(d) {
  const value = Array.isArray(d.value) ? d.value.join(', ') : d.value;
  return value != null && value !== '' ? `${d.param} "${value}" (${d.message})` : `${d.param} (${d.message})`;
}

export default function App() {
  const [filters, setFilters] = useUrlFilters();
  const [notice, setNotice] = useState(null); // details[] dropped automatically
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const sentinelRef = useRef(null);

  // A 400 names the rejected params: drop just those from the URL and try once more.
  const onInvalidParams = useCallback(
    (details) => {
      const result = removeRejected(filtersRef.current, details);
      if (!result) return false;
      setFilters(result.filters, { replace: true });
      setNotice(result.applied);
      return true;
    },
    [setFilters]
  );

  const { items, total, facets, loading, error, stale, hasMore, loadMore, retry } = useProductSearch(filters, {
    pageSize: PAGE_SIZE,
    onInvalidParams,
  });

  const changeFilters = (next) => {
    setNotice(null);
    setFilters(next);
  };
  const clearFilters = () => changeFilters({ ...DEFAULT_FILTERS, sort: filters.sort });

  // Infinite scroll: load the next page when the sentinel comes into view. The observer is
  // recreated after each page so it fires again if the sentinel is still on screen.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || error || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, error, hasMore, items.length]);

  const activeCount = countActive(filters);
  const isEmpty = !loading && !error && !stale && total === 0;

  return (
    <div className="page">
      <header className="header">
        <div className="header-inner">
          <span className="logo">Shop</span>
          <span className="header-tag">Everyday things, delivered</span>
        </div>
      </header>

      <section className="hero">
        <h1>Find something you'll love</h1>
        <p>Browse our catalog of electronics, books, home goods, fashion and outdoor gear.</p>
      </section>

      <div className="content layout">
        <aside className={`sidebar${filtersOpen ? ' is-open' : ''}`} id="filters" aria-label="Product filters">
          <FilterPanel filters={filters} facets={facets} onChange={changeFilters} />
        </aside>

        <main className="main">
          <div className="results-bar">
            <button
              type="button"
              className="btn filters-toggle"
              aria-expanded={filtersOpen}
              aria-controls="filters"
              onClick={() => setFiltersOpen((o) => !o)}
            >
              Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </button>
            <span className="results-count" aria-live="polite">
              {total !== null && (
                <>
                  Showing <strong>{items.length}</strong> of <strong>{total}</strong> products
                </>
              )}
            </span>
            <SortSelect value={filters.sort} onChange={(sort) => changeFilters({ ...filters, sort })} />
          </div>

          {notice && (
            <div className="notice" role="status">
              <span>
                Some filters in this link weren't valid and were removed: {notice.map(describeRejected).join('; ')}.
              </span>
              <button type="button" className="link-btn" onClick={() => setNotice(null)}>
                Dismiss
              </button>
            </div>
          )}

          <div className={`grid${stale ? ' is-stale' : ''}`} aria-busy={loading}>
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {isEmpty && (
            <div className="status empty">
              <p>No products match these filters.</p>
              {activeCount > 0 && (
                <button className="btn" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="status status-error" role="alert">
              <span>
                Couldn't load products: {error.message}
                {error.details?.length > 0 && ` (${error.details.map(describeRejected).join('; ')})`}
              </span>
              {error.status === 400 ? (
                <button className="btn" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : (
                <button className="btn" onClick={retry}>
                  Try again
                </button>
              )}
            </div>
          )}

          {loading && (items.length === 0 || !stale) && <div className="status">Loading products…</div>}

          {!error && hasMore && !loading && items.length > 0 && (
            <div className="status">
              <button className="btn" onClick={loadMore}>
                Load more
              </button>
            </div>
          )}

          {!error && !stale && !hasMore && items.length > 0 && !loading && (
            <div className="status muted">You've seen everything.</div>
          )}

          <div ref={sentinelRef} aria-hidden="true" />
        </main>
      </div>
    </div>
  );
}
