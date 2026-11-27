import { SORT_OPTIONS } from '../filters.js';

export default function SortSelect({ value, onChange }) {
  return (
    <label className="sort-select">
      <span>Sort by</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
