import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FILTERS } from '../filters.js';
import { useProductSearch } from './useProductSearch.js';

const facets = {
  categories: [{ value: 'Books', count: 8 }],
  rating: [{ min: 4, count: 1 }],
  inStock: { count: 1 },
  price: { min: 1, max: 2 },
};
const product = (id) => ({ id, name: id, price: 1, rating: 4, reviewCount: 1, inStock: true });
const page = (ids, { page = 1, total = ids.length, totalPages = 1 } = {}) => ({
  items: ids.map(product),
  total,
  page,
  limit: 12,
  totalPages,
  facets,
});

// fetch mock where each call stays pending until the test resolves it; honours AbortSignal.
let calls;
function mockFetch() {
  calls = [];
  globalThis.fetch = vi.fn((url, { signal } = {}) => {
    const call = { url: new URL(url), signal };
    const promise = new Promise((resolve, reject) => {
      call.respond = (body, status = 200) =>
        resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    });
    calls.push(call);
    return promise;
  });
}

beforeEach(mockFetch);
afterEach(() => vi.restoreAllMocks());

describe('useProductSearch', () => {
  it('loads page 1, then the next page, deduping by id', async () => {
    const { result } = renderHook(() => useProductSearch(DEFAULT_FILTERS));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].url.searchParams.get('page')).toBe('1');
    expect(calls[0].url.searchParams.get('limit')).toBe('12');

    await act(async () => calls[0].respond(page(['p1', 'p2'], { total: 3, totalPages: 2 })));
    expect(result.current.items.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.facets).toEqual(facets);

    act(() => result.current.loadMore());
    act(() => result.current.loadMore()); // ignored while one is in flight
    expect(calls).toHaveLength(2);
    expect(calls[1].url.searchParams.get('page')).toBe('2');

    await act(async () => calls[1].respond(page(['p2', 'p3'], { page: 2, total: 3, totalPages: 2 })));
    expect(result.current.items.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
    expect(result.current.hasMore).toBe(false);
  });

  it('resets to page 1 on a filter change and never shows a late response', async () => {
    const { result, rerender } = renderHook(({ filters }) => useProductSearch(filters), {
      initialProps: { filters: DEFAULT_FILTERS },
    });
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => calls[0].respond(page(['p1'], { total: 2, totalPages: 2 })));

    act(() => result.current.loadMore()); // page 2 of the old filters in flight
    expect(calls).toHaveLength(2);

    const books = { ...DEFAULT_FILTERS, categories: ['Books', 'Fashion'], sort: 'price_asc' };
    rerender({ filters: books });
    await waitFor(() => expect(calls).toHaveLength(3));
    expect(calls[1].signal.aborted).toBe(true);
    expect(result.current.stale).toBe(true);
    expect(result.current.hasMore).toBe(false); // no infinite scroll on stale results

    const sp = calls[2].url.searchParams;
    expect(sp.get('page')).toBe('1');
    expect(sp.getAll('category')).toEqual(['Books', 'Fashion']);
    expect(sp.get('sort')).toBe('price_asc');

    // Change again before the response; the earlier page-1 response arrives late.
    rerender({ filters: { ...books, inStock: true } });
    await waitFor(() => expect(calls).toHaveLength(4));
    await act(async () => calls[2].respond(page(['late'])));
    expect(result.current.items.map((p) => p.id)).toEqual(['p1']);

    await act(async () => calls[3].respond(page(['b1'])));
    expect(result.current.items.map((p) => p.id)).toEqual(['b1']);
    expect(result.current.stale).toBe(false);
    expect(result.current.total).toBe(1);
  });

  it('on a 400 with details asks the caller to fix the filters once, then shows the error', async () => {
    const onInvalidParams = vi.fn(() => true);
    const bad = { ...DEFAULT_FILTERS, categories: ['Toys'] };
    const { result, rerender } = renderHook(({ filters }) => useProductSearch(filters, { onInvalidParams }), {
      initialProps: { filters: bad },
    });
    const error = {
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid query parameters',
        details: [{ param: 'category', value: 'Toys', message: 'unknown category' }],
      },
    };
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => calls[0].respond(error, 400));
    expect(onInvalidParams).toHaveBeenCalledWith(error.error.details);
    expect(result.current.error).toBeNull();

    // The caller changed the filters; that request fails too, so no second auto-fix.
    rerender({ filters: { ...DEFAULT_FILTERS, minPrice: 1 } });
    await waitFor(() => expect(calls).toHaveLength(2));
    await act(async () => calls[1].respond(error, 400));
    expect(onInvalidParams).toHaveBeenCalledTimes(1);
    expect(result.current.error.message).toBe('Invalid query parameters');
    expect(result.current.error.details).toEqual(error.error.details);
    expect(result.current.loading).toBe(false);
  });

  it('keeps loaded items when a later page fails, and retry asks for that page again', async () => {
    const { result } = renderHook(() => useProductSearch(DEFAULT_FILTERS));
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => calls[0].respond(page(['p1'], { total: 2, totalPages: 2 })));
    act(() => result.current.loadMore());
    await act(async () => calls[1].respond({ error: { code: 'X', message: 'boom' } }, 500));
    expect(result.current.error.message).toBe('boom');
    expect(result.current.items).toHaveLength(1);

    act(() => result.current.retry());
    expect(calls[2].url.searchParams.get('page')).toBe('2');
  });
});
