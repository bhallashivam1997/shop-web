import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchProducts } from './api.js';
import ProductCard from './components/ProductCard.jsx';

const PAGE_SIZE = 12;

export default function App() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0); // last page loaded
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadingRef = useRef(false);
  const sentinelRef = useRef(null);

  const hasMore = total === null || items.length < total;

  const loadNext = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts({ page: page + 1, limit: PAGE_SIZE });
      setItems((prev) => [...prev, ...data.items]);
      setTotal(data.total);
      setPage(data.page);
    } catch (err) {
      setError(err.message);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [page, hasMore]);

  // First page
  useEffect(() => {
    loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll: load the next page when the sentinel comes into view
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadNext();
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadNext, error]);

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

      <main className="content">
        <div className="results-bar">
          {total !== null && (
            <span>
              Showing <strong>{items.length}</strong> of <strong>{total}</strong> products
            </span>
          )}
        </div>

        <div className="grid">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        {error && (
          <div className="status status-error" role="alert">
            Couldn't load products: {error}
            <button className="btn" onClick={loadNext}>
              Try again
            </button>
          </div>
        )}

        {loading && <div className="status">Loading products…</div>}

        {!error && hasMore && !loading && items.length > 0 && (
          <div className="status">
            <button className="btn" onClick={loadNext}>
              Load more
            </button>
          </div>
        )}

        {!hasMore && items.length > 0 && <div className="status muted">You've seen everything.</div>}

        <div ref={sentinelRef} aria-hidden="true" />
      </main>
    </div>
  );
}
