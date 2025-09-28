import { 
  SortAsc, 
  SortDesc, 
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Type,
  Clock,
  ChevronDown
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { cn } from '../lib/utils';

const TaskSort = ({
  sortBy,
  sortOrder,
  onSortChange,
  className
}) => {
  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      onSortChange(newSortBy, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(newSortBy, 'asc');
    }
  };

  const getSortLabel = () => {
    const labels = {
      dueDate: 'Due Date',
      priority: 'Priority',
      status: 'Status',
      title: 'Title',
      createdAt: 'Created',
      updatedAt: 'Updated'
    };
    return labels[sortBy] || 'Sort';
  };

  const sortOptions = [
    { value: 'dueDate', label: 'Due Date' },
    { value: 'priority', label: 'Priority' },
    { value: 'status', label: 'Status' },
    { value: 'title', label: 'Title' },
    { value: 'createdAt', label: 'Created' },
    { value: 'updatedAt', label: 'Updated' }
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", className)}>
          {sortOrder === 'asc' ? 
            <SortAsc className="h-4 w-4" /> : 
            <SortDesc className="h-4 w-4" />
          }
          <span className="hidden sm:inline">{getSortLabel()}</span>
          <span className="sm:hidden">Sort</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sortOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSortChange(option.value)}
            className="flex items-center justify-between"
          >
            <span>{option.label}</span>
            {sortBy === option.value && (
              <span className="text-xs text-muted-foreground">
                {sortOrder === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-2"
        >
          {sortOrder === 'asc' ? 
            <SortDesc className="h-4 w-4" /> : 
            <SortAsc className="h-4 w-4" />
          }
          <span>
            Switch to {sortOrder === 'asc' ? 'Descending' : 'Ascending'}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TaskSort;