import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, countActive, filtersKey, parseFilters, removeRejected, toSearchParams } from './filters.js';

describe('parseFilters / toSearchParams', () => {
  it('returns defaults for an empty query', () => {
    expect(parseFilters('')).toEqual(DEFAULT_FILTERS);
    expect(filtersKey(DEFAULT_FILTERS)).toBe('');
  });

  it('reads repeated category params and round-trips with encoding', () => {
    const search = '?category=Electronics&category=Home+%26+Kitchen&minPrice=10&maxPrice=99.5&minRating=4&inStock=true&sort=price_desc';
    const f = parseFilters(search);
    expect(f).toEqual({
      categories: ['Electronics', 'Home & Kitchen'],
      minPrice: 10,
      maxPrice: 99.5,
      minRating: 4,
      inStock: true,
      sort: 'price_desc',
    });
    const qs = toSearchParams(f).toString();
    expect(qs).toBe(
      'category=Electronics&category=Home+%26+Kitchen&minPrice=10&maxPrice=99.5&minRating=4&inStock=true&sort=price_desc'
    );
    expect(parseFilters(qs)).toEqual(f);
  });

  it('leaves out defaults and never sends inStock=false or an empty value', () => {
    const qs = toSearchParams({ ...DEFAULT_FILTERS, categories: ['Books'] }).toString();
    expect(qs).toBe('category=Books');
  });

  it('drops garbage numbers, unknown sort values and duplicate categories', () => {
    const f = parseFilters('?minPrice=abc&maxPrice=&minRating=x&inStock=yes&sort=newest&category=Books&category=Books&category=');
    expect(f).toEqual({ ...DEFAULT_FILTERS, categories: ['Books'] });
  });

  it('rounds prices to cents', () => {
    expect(parseFilters('?minPrice=10.555').minPrice).toBe(10.56);
    expect(toSearchParams({ ...DEFAULT_FILTERS, maxPrice: 19.999 }).get('maxPrice')).toBe('20');
  });

  it('keeps a non-integer minRating as given', () => {
    expect(parseFilters('?minRating=3.5').minRating).toBe(3.5);
  });

  it('counts active filters, not sort', () => {
    expect(countActive({ ...DEFAULT_FILTERS, sort: 'rating_desc' })).toBe(0);
    expect(
      countActive({ ...DEFAULT_FILTERS, categories: ['Books', 'Fashion'], minPrice: 5, maxPrice: 9, inStock: true })
    ).toBe(4);
  });
});

describe('removeRejected', () => {
  const filters = {
    ...DEFAULT_FILTERS,
    categories: ['Books', 'Toys', 'Gadgets'],
    minPrice: -5,
    minRating: 4,
  };

  it('drops only the rejected category values and scalar params', () => {
    const result = removeRejected(filters, [
      { param: 'category', value: 'Toys', message: 'unknown category' },
      { param: 'category', value: 'Gadgets', message: 'unknown category' },
      { param: 'minPrice', value: '-5', message: 'must be a number >= 0' },
    ]);
    expect(result.filters).toEqual({ ...filters, categories: ['Books'], minPrice: null });
    expect(result.applied).toHaveLength(3);
  });

  it('drops every category when value is missing', () => {
    expect(removeRejected(filters, [{ param: 'category', message: 'bad' }]).filters.categories).toEqual([]);
  });

  it('accepts an array value', () => {
    expect(
      removeRejected(filters, [{ param: 'category', value: ['Toys', 'Gadgets'], message: 'x' }]).filters.categories
    ).toEqual(['Books']);
  });

  it('returns null when nothing can be removed, so the caller does not retry', () => {
    expect(removeRejected(filters, [{ param: 'limit', value: '99', message: 'too big' }])).toBeNull();
    expect(removeRejected(filters, [{ param: 'maxPrice', value: '1', message: 'x' }])).toBeNull();
    expect(removeRejected(filters, [])).toBeNull();
  });
});
