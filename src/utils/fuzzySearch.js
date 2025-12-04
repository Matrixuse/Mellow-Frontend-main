import Fuse from 'fuse.js';

export function createFuzzySearch(list, keys) {
  return new Fuse(list, {
    keys,
    threshold: 0.4,
    minMatchCharLength: 2,
    includeScore: true,
    shouldSort: true,
  });
}

export function getFuzzySuggestions(fuse, query, limit = 5) {
  if (!query) return [];
  return fuse.search(query).slice(0, limit).map(r => r.item);
}
