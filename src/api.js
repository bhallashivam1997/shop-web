// All calls to shop-api go through this file.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function fetchProducts({ page = 1, limit = 12 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await fetch(`${API_URL}/products?${params}`);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error?.message || `Request failed (${res.status})`);
  }
  return body; // { items, total, page, limit, totalPages }
}
