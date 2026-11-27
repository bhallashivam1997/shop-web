// Filter state <-> URL query string. The same params are used in the page URL
// and in the GET /products request (see shop-api contracts/product-filters.openapi.yaml).

export const CATEGORIES = ['Electronics', 'Books', 'Home & Kitchen', 'Fashion', 'Sports & Outdoors'];

export const SORT_OPTIONS = [
  { value: '', label: 'Featured' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating_desc', label: 'Top rated' },
];
const SORT_VALUES = new Set(SORT_OPTIONS.map((o) => o.value).filter(Boolean));

export const RATING_THRESHOLDS = [4, 3, 2, 1];

export const DEFAULT_FILTERS = Object.freeze({
  categories: [],
  minPrice: null,
  maxPrice: null,
  minRating: null,
  inStock: false,
  sort: null,
});

function toNumber(raw) {
  if (raw == null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Round a price to cents so URLs stay clean (the server applies no rounding). */
export function roundPrice(n) {
  return n == null ? null : Math.round(n * 100) / 100;
}

/**
 * Parse a query string (or URLSearchParams) into normalised filters.
 * Unparseable numbers and unknown sort values are dropped. Category names are
 * kept as given: the server owns the list and rejects unknown ones, and the
 * client then drops them (see removeRejected).
 */
export function parseFilters(search) {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  const categories = [...new Set(params.getAll('category').filter((c) => c !== ''))];
  const sort = params.get('sort');
  return {
    categories,
    minPrice: roundPrice(toNumber(params.get('minPrice'))),
    maxPrice: roundPrice(toNumber(params.get('maxPrice'))),
    minRating: toNumber(params.get('minRating')),
    inStock: params.get('inStock') === 'true',
    sort: SORT_VALUES.has(sort) ? sort : null,
  };
}

/** Serialise filters in a fixed order, leaving out defaults. */
export function toSearchParams(filters) {
  const params = new URLSearchParams();
  for (const c of filters.categories) params.append('category', c);
  if (filters.minPrice != null) params.set('minPrice', String(roundPrice(filters.minPrice)));
  if (filters.maxPrice != null) params.set('maxPrice', String(roundPrice(filters.maxPrice)));
  if (filters.minRating != null) params.set('minRating', String(filters.minRating));
  if (filters.inStock) params.set('inStock', 'true');
  if (filters.sort) params.set('sort', filters.sort);
  return params;
}

export function filtersKey(filters) {
  return toSearchParams(filters).toString();
}

/** Number of active filters (sort is not a filter). */
export function countActive(filters) {
  return (
    filters.categories.length +
    (filters.minPrice != null || filters.maxPrice != null ? 1 : 0) +
    (filters.minRating != null ? 1 : 0) +
    (filters.inStock ? 1 : 0)
  );
}

/**
 * Remove the params a 400 response rejected (error.details[]). Returns the new
 * filters plus the details that were applied, or null when nothing could be removed
 * (so the caller must not retry).
 */
export function removeRejected(filters, details) {
  const next = { ...filters, categories: [...filters.categories] };
  const applied = [];
  for (const d of details || []) {
    switch (d.param) {
      case 'category': {
        const values = d.value == null ? null : [].concat(d.value);
        const before = next.categories.length;
        next.categories = values ? next.categories.filter((c) => !values.includes(c)) : [];
        if (next.categories.length !== before) applied.push(d);
        break;
      }
      case 'minPrice':
      case 'maxPrice':
      case 'minRating':
      case 'sort':
        if (next[d.param] != null) {
          next[d.param] = null;
          applied.push(d);
        }
        break;
      case 'inStock':
        if (next.inStock) {
          next.inStock = false;
          applied.push(d);
        }
        break;
      default:
        break; // page/limit are client-controlled; nothing in the URL to drop
    }
  }
  return applied.length ? { filters: next, applied } : null;
}
