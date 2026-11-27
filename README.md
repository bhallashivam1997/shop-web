# shop-web

Demo shop frontend: a React + Vite landing page with an infinite-scroll product grid, backed by [`shop-api`](../shop-api).

## Run

Start `shop-api` first (http://localhost:4000), then:

```bash
npm install
npm run dev      # http://localhost:5173
```

To point at a different backend, set `VITE_API_URL` (default `http://localhost:4000`).

```bash
npm test         # Vitest (jsdom)
npm run build
```

## Filters and sorting

Filtering, sorting and the per-option counts come from the server
(`GET /products`, see `shop-api/contracts/product-filters.openapi.yaml`).
Active filters live in the page URL using the same params as the API, so links
can be shared, survive a reload, and Back/Forward step through filter states:

| Param | Example | Meaning |
|---|---|---|
| `category` (repeatable) | `category=Books&category=Fashion` | any of these categories |
| `minPrice`, `maxPrice` | `minPrice=10&maxPrice=99.99` | USD, inclusive |
| `minRating` | `minRating=4` | rating >= 4 |
| `inStock` | `inStock=true` | in-stock only |
| `sort` | `price_asc`, `price_desc`, `rating_desc` | default is catalog order |

Any filter or sort change restarts at page 1 and cancels the request in flight.
If the server rejects params from a link (400 with `error.details`), they are
removed from the URL, a notice is shown, and the request is retried once.

## Structure

- `src/api.js`: every call to the backend goes through here
- `src/App.jsx`: landing page layout, infinite scroll, empty/loading/error states
- `src/filters.js`: filter state <-> URL/API query params
- `src/hooks/useUrlFilters.js`: filters kept in the URL (history API, no router)
- `src/hooks/useProductSearch.js`: paged, filtered search (abort, stale-response guard, dedupe)
- `src/components/FilterPanel.jsx`, `SortSelect.jsx`: filter sidebar with counts, sort menu
- `src/components/ProductCard.jsx`: one product tile
