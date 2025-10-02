export const parseSearchQuery = (query) => {
  if (!query) return { terms: '', filters: {} };
  
  const filters = {};
  let terms = query;
  
  const filterRegex = /(\w+):([^\s]+)/g;
  let match;
  
  while ((match = filterRegex.exec(query)) !== null) {
    const [fullMatch, filterType, filterValue] = match;
    
    if (filters[filterType]) {
      if (Array.isArray(filters[filterType])) {
        filters[filterType].push(filterValue);
      } else {
        filters[filterType] = [filters[filterType], filterValue];
      }
    } else {
      filters[filterType] = filterValue;
    }
    
    terms = terms.replace(fullMatch, '').trim();
  }
  
  return {
    terms: terms.trim(),
    filters
  };
};


export const combineFilters = (activeFilters, searchFilters) => {
  const combined = { ...activeFilters };
  
  Object.entries(searchFilters).forEach(([filterType, value]) => {
    if (combined[filterType]) {
      const existing = Array.isArray(combined[filterType]) ? combined[filterType] : [combined[filterType]];
      const newValues = Array.isArray(value) ? value : [value];
      combined[filterType] = [...new Set([...existing, ...newValues])];
    } else {
      combined[filterType] = Array.isArray(value) ? value : [value];
    }
  });
  
  return combined;
};


export const recentSearchManager = {
  key: 'taskSearchHistory',
  maxItems: 10,
  
  get() {
    try {
      const stored = localStorage.getItem(this.key);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },
  
  add(searchTerm) {
    if (!searchTerm || searchTerm.trim().length < 2) return;
    
    const searches = this.get();
    const trimmed = searchTerm.trim();
    
    const filtered = searches.filter(s => s !== trimmed);
    
    filtered.unshift(trimmed);
    
    const limited = filtered.slice(0, this.maxItems);
    
    try {
      localStorage.setItem(this.key, JSON.stringify(limited));
    } catch {
      // do nothing
    }
  },
  
  clear() {
    try {
      localStorage.removeItem(this.key);
    } catch {
      // do nothing
    }
  }
};