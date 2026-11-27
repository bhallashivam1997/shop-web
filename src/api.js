// All calls to shop-api go through this file.
import { DEFAULT_FILTERS, toSearchParams } from './filters.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  constructor({ status, code, message, details }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details || [];
  }
}

/**
 * GET /products with filters, sort and paging.
 * Resolves to { items, total, page, limit, totalPages, facets }.
 * Rejects with ApiError (400 carries error.details[] of { param, value, message }).
 */
export async function fetchProducts({ page = 1, limit = 12, filters = DEFAULT_FILTERS, signal } = {}) {
  const params = toSearchParams(filters);
  params.set('page', String(page));
  params.set('limit', String(limit));
  const res = await fetch(`${API_URL}/products?${params}`, { signal });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError({
      status: res.status,
      code: body?.error?.code,
      message: body?.error?.message || `Request failed (${res.status})`,
      details: body?.error?.details,
    });
  }
  return body;
}
