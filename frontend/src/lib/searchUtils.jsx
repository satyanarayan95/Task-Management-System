


export const highlightSearchTerm = (text, searchTerm, className = 'bg-yellow-200 dark:bg-yellow-800 px-1 rounded') => {
  if (!text || !searchTerm) return text;
  
  const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
  return text.replace(regex, `<mark class="${className}">$1</mark>`);
};


export const HighlightedText = ({ text, searchTerm, className = '' }) => {
  if (!text || !searchTerm) {
    return <span className={className}>{text}</span>;
  }
  
  const parts = text.split(new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi'));
  
  return (
    <span className={className}>
      {parts.map((part, index) => 
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};


export const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};


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


export const buildSearchSuggestions = (input, recentSearches = [], availableFilters = {}) => {
  const suggestions = [];
  const query = input.toLowerCase();
  
  if (!query) return suggestions;
  
  const filterTypes = ['status', 'priority', 'category', 'assignees'];
  
  filterTypes.forEach(filterType => {
    if (filterType.includes(query) && !input.includes(`${filterType}:`)) {
      const values = availableFilters[filterType] || [];
      
      if (values.length > 0) {
        suggestions.push({
          type: 'filter',
          text: `${filterType}:`,
          description: `Filter by ${filterType}`,
          category: 'Filters'
        });
        
        values.forEach(value => {
          const valueStr = typeof value === 'object' ? value.name : value;
          if (valueStr.toLowerCase().includes(query)) {
            suggestions.push({
              type: 'filter',
              text: `${filterType}:${valueStr}`,
              description: `Filter by ${filterType}: ${valueStr}`,
              category: 'Filters'
            });
          }
        });
      }
    }
  });
  
  recentSearches.forEach(search => {
    if (search.toLowerCase().includes(query) && search !== input) {
      suggestions.push({
        type: 'recent',
        text: search,
        description: 'Recent search',
        category: 'Recent'
      });
    }
  });
  
  return suggestions.slice(0, 8); // Limit suggestions
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


export const formatSearchResultsMessage = (count, searchTerm, totalTasks) => {
  if (count === 0) {
    return `No tasks found matching "${searchTerm}"`;
  }
  
  if (count === totalTasks) {
    return `All ${count} tasks match "${searchTerm}"`;
  }
  
  return `${count} of ${totalTasks} tasks match "${searchTerm}"`;
};


export const getSearchExamples = () => [
  {
    text: 'status:todo',
    description: 'Find all pending tasks'
  },
  {
    text: 'priority:urgent',
    description: 'Find urgent tasks'
  },
  {
    text: 'meeting',
    description: 'Search for tasks containing "meeting"'
  },
  {
    text: 'status:done priority:high',
    description: 'Combine multiple filters'
  }
];


export const getNoResultsSuggestions = (searchTerm) => {
  const suggestions = [
    'Check for typos in your search term',
    'Try using broader or different keywords',
    'Use partial words (e.g., "meet" instead of "meeting")',
    'Try searching by status (e.g., "status:todo")',
    'Search by priority (e.g., "priority:high")',
    'Remove some filters to broaden your search'
  ];
  
  if (searchTerm.length < 3) {
    suggestions.unshift('Try using at least 3 characters for better results');
  }
  
  if (searchTerm.includes(':')) {
    suggestions.unshift('Check your filter syntax (e.g., "status:todo" not "status: todo")');
  }
  
  return suggestions.slice(0, 4); // Return top 4 suggestions
};


export const getSearchHelpText = (totalTasks, hasFilters) => {
  if (totalTasks === 0) {
    return "You don't have any tasks yet. Create your first task to get started!";
  }
  
  if (hasFilters) {
    return `Searching through ${totalTasks} tasks with active filters. Try removing filters for broader results.`;
  }
  
  return `Search through your ${totalTasks} tasks by title, description, or use filters like "status:todo".`;
};