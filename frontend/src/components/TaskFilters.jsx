import { 
  Filter, 
  X, 
  ChevronDown
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { cn } from '../lib/utils';

const TaskFilters = ({
  filters,
  onFilterChange,
  onClearFilters,
  categories = [],
  users = [],
  className
}) => {
  const getActiveFilterCount = () => {
    return Object.values(filters).reduce((count, filterArray) => count + filterArray.length, 0);
  };

  const handleFilterToggle = (filterType, value, checked) => {
    onFilterChange(filterType, value, checked);
  };

  const removeFilter = (filterType, value) => {
    onFilterChange(filterType, value, false);
  };

  const getFilterLabel = (filterType, value) => {
    switch (filterType) {
      case 'status':
        return value.replace('_', ' ');
      case 'priority':
        return value;
      case 'category': {
        const category = categories.find(c => c._id === value);
        return category ? category.name : value;
      }
      case 'assignees': {
        const user = users.find(u => u._id === value);
        return user ? user.fullName : value;
      }
      default:
        return value;
    }
  };

  const statusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' }
  ];

  const priorityOptions = [
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                {getActiveFilterCount()}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>Filter by</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuLabel className="text-xs text-muted-foreground">Status</DropdownMenuLabel>
          {statusOptions.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={filters.status.includes(option.value)}
              onCheckedChange={(checked) => handleFilterToggle('status', option.value, checked)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuLabel className="text-xs text-muted-foreground">Priority</DropdownMenuLabel>
          {priorityOptions.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={filters.priority.includes(option.value)}
              onCheckedChange={(checked) => handleFilterToggle('priority', option.value, checked)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
          
          {categories.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Category</DropdownMenuLabel>
              {categories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category._id}
                  checked={filters.category.includes(category._id)}
                  onCheckedChange={(checked) => handleFilterToggle('category', category._id, checked)}
                >
                  {category.name}
                </DropdownMenuCheckboxItem>
              ))}
            </>
          )}
          
          {users.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Assignee</DropdownMenuLabel>
              {users.map((user) => (
                <DropdownMenuCheckboxItem
                  key={user._id}
                  checked={filters.assignees.includes(user._id)}
                  onCheckedChange={(checked) => handleFilterToggle('assignees', user._id, checked)}
                >
                  {user.fullName}
                </DropdownMenuCheckboxItem>
              ))}
            </>
          )}
          
          {getActiveFilterCount() > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                onCheckedChange={() => onClearFilters()}
                className="text-muted-foreground"
              >
                Clear all filters
              </DropdownMenuCheckboxItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {getActiveFilterCount() > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {Object.entries(filters).map(([filterType, values]) =>
            values.map((value) => (
              <Badge
                key={`${filterType}-${value}`}
                variant="secondary"
                className="gap-1 pr-1 text-xs"
              >
                {getFilterLabel(filterType, value)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFilter(filterType, value)}
                  className="h-4 w-4 p-0 hover:bg-transparent ml-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TaskFilters;