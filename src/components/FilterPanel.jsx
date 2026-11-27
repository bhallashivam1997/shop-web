import { useEffect, useState } from 'react';
import { CATEGORIES, DEFAULT_FILTERS, RATING_THRESHOLDS, countActive, roundPrice } from '../filters.js';

function Count({ value }) {
  if (value == null) return null;
  return <span className="filter-count">{value}</span>;
}

function parsePriceInput(raw) {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? roundPrice(n) : undefined; // undefined = invalid, keep previous
}

function PriceRange({ minPrice, maxPrice, bounds, onCommit }) {
  const [min, setMin] = useState(minPrice ?? '');
  const [max, setMax] = useState(maxPrice ?? '');

  // Follow external changes (Back/Forward, Clear all, a rejected param being dropped).
  useEffect(() => setMin(minPrice ?? ''), [minPrice]);
  useEffect(() => setMax(maxPrice ?? ''), [maxPrice]);

  const commit = () => {
    const nextMin = parsePriceInput(String(min));
    const nextMax = parsePriceInput(String(max));
    const resolvedMin = nextMin === undefined ? minPrice : nextMin;
    const resolvedMax = nextMax === undefined ? maxPrice : nextMax;
    setMin(resolvedMin ?? '');
    setMax(resolvedMax ?? '');
    if (resolvedMin !== minPrice || resolvedMax !== maxPrice) onCommit(resolvedMin, resolvedMax);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
  };

  return (
    <div className="price-range">
      <label>
        <span className="visually-hidden">Minimum price</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder={bounds?.min != null ? `$${Math.floor(bounds.min)}` : 'Min'}
          value={min}
          onChange={(e) => setMin(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
      </label>
      <span className="price-sep">to</span>
      <label>
        <span className="visually-hidden">Maximum price</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder={bounds?.max != null ? `$${Math.ceil(bounds.max)}` : 'Max'}
          value={max}
          onChange={(e) => setMax(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
      </label>
    </div>
  );
}

export default function FilterPanel({ filters, facets, onChange }) {
  const categoryOptions =
    facets?.categories ?? CATEGORIES.map((value) => ({ value, count: null }));
  const ratingCounts = new Map((facets?.rating ?? []).map((r) => [r.min, r.count]));
  const ratingSelected = RATING_THRESHOLDS.includes(filters.minRating) ? filters.minRating : null;

  const toggleCategory = (value) => {
    const has = filters.categories.includes(value);
    // Keep the contract's category order so equivalent selections share one URL.
    const next = has
      ? filters.categories.filter((c) => c !== value)
      : CATEGORIES.filter((c) => c === value || filters.categories.includes(c));
    onChange({ ...filters, categories: next });
  };

  return (
    <div className="filters">
      <div className="filters-head">
        <h2>Filters</h2>
        {countActive(filters) > 0 && (
          <button
            type="button"
            className="link-btn"
            onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}
          >
            Clear all
          </button>
        )}
      </div>

      <fieldset className="filter-group">
        <legend>Category</legend>
        {categoryOptions.map(({ value, count }) => {
          const checked = filters.categories.includes(value);
          return (
            <label key={value} className={`filter-option${count === 0 && !checked ? ' is-empty' : ''}`}>
              <input
                type="checkbox"
                checked={checked}
                disabled={count === 0 && !checked}
                onChange={() => toggleCategory(value)}
              />
              <span className="filter-label">{value}</span>
              <Count value={count} />
            </label>
          );
        })}
      </fieldset>

      <fieldset className="filter-group">
        <legend>Price (USD)</legend>
        <PriceRange
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          bounds={facets?.price}
          onCommit={(minPrice, maxPrice) => onChange({ ...filters, minPrice, maxPrice })}
        />
      </fieldset>

      <fieldset className="filter-group">
        <legend>Customer rating</legend>
        {RATING_THRESHOLDS.map((min) => {
          const count = ratingCounts.get(min);
          const checked = ratingSelected === min;
          return (
            <label key={min} className={`filter-option${count === 0 && !checked ? ' is-empty' : ''}`}>
              <input
                type="radio"
                name="minRating"
                checked={checked}
                disabled={count === 0 && !checked}
                onChange={() => onChange({ ...filters, minRating: min })}
              />
              <span className="filter-label">
                <span className="stars" aria-hidden="true">{'★'.repeat(min)}</span>
                <span className="stars-empty" aria-hidden="true">{'★'.repeat(5 - min)}</span> & up
                <span className="visually-hidden">{min} stars and up</span>
              </span>
              <Count value={count} />
            </label>
          );
        })}
        <label className="filter-option">
          <input
            type="radio"
            name="minRating"
            checked={ratingSelected === null}
            onChange={() => onChange({ ...filters, minRating: null })}
          />
          <span className="filter-label">Any rating</span>
        </label>
      </fieldset>

      <fieldset className="filter-group">
        <legend>Availability</legend>
        <label className={`filter-option${facets?.inStock.count === 0 && !filters.inStock ? ' is-empty' : ''}`}>
          <input
            type="checkbox"
            checked={filters.inStock}
            disabled={facets?.inStock.count === 0 && !filters.inStock}
            onChange={() => onChange({ ...filters, inStock: !filters.inStock })}
          />
          <span className="filter-label">In stock only</span>
          <Count value={facets?.inStock.count} />
        </label>
      </fieldset>
    </div>
  );
}
