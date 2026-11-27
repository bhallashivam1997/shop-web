# shop-web

Demo shop frontend: a React + Vite landing page with an infinite-scroll product grid, backed by [`shop-api`](../shop-api).

## Run

Start `shop-api` first (http://localhost:4000), then:

```bash
npm install
npm run dev      # http://localhost:5173
```

To point at a different backend, set `VITE_API_URL` (default `http://localhost:4000`).

## Structure

- `src/api.js`: every call to the backend goes through here
- `src/App.jsx`: landing page, pagination and infinite scroll
- `src/components/ProductCard.jsx`: one product tile
