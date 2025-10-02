import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertCircle,
  Grid3X3,
  List,
  CheckSquare2
} from 'lucide-react';
import TaskGridCard from './TaskGridCard';
import TaskTable from './TaskTable';
import TaskForm from './TaskForm';
import TaskFilters from './TaskFilters';
import TaskSort from './TaskSort';
import Pagination from './ui/pagination';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardHeader } from './ui/card';
import { taskAPI } from '../lib/api';
import { taskToast } from '../lib/toast';
import { cn } from '../lib/utils';
import {
  recentSearchManager,
  parseSearchQuery,
  combineFilters,
} from '../lib/searchUtils';

const TaskList = ({ className, searchTerm: externalSearchTerm = '', searchResetKey = 0 }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalTasks: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768 ? 'list' : 'grid';
    }
    return 'list';
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState({
    status: [],
    priority: [],
    category: [],
    assignees: [],
    dueDate: []
  });
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskFormMode, setTaskFormMode] = useState('create');
  const lastApiCallRef = useRef(0);
  const searchTerm = externalSearchTerm;
  const displayTasks = tasks;

  useEffect(() => {
    const handleResize = () => {
      const newViewMode = window.innerWidth >= 768 ? 'list' : 'grid';
      setViewMode(newViewMode);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (searchResetKey > 0) {
      setCurrentPage(1);
      fetchTasks(1, pageSize, searchTerm, filters, sortBy, sortOrder);
    }
  }, [searchResetKey, pageSize, searchTerm, filters, sortBy, sortOrder]);

  useEffect(() => {
    if (searchResetKey === 0) {
      fetchTasks();
    }
  }, [searchTerm]);

  useEffect(() => {
    const onOpenCreate = () => handleCreateTask()
    const onOpenSearch = () => {
      const input = document.querySelector('input[placeholder="Search tasks by title, description, or assignees..."]')
      if (input) input.focus()
    }
    window.addEventListener('open-create-task', onOpenCreate)
    window.addEventListener('open-search', onOpenSearch)
    return () => {
      window.removeEventListener('open-create-task', onOpenCreate)
      window.removeEventListener('open-search', onOpenSearch)
    }
  }, []);

  const fetchTasks = useCallback(async (page = currentPage, size = pageSize, search = searchTerm, filterState = filters, sortField = sortBy, sortDirection = sortOrder) => {
    try {
      const now = Date.now();
      if (now - lastApiCallRef.current < 500) {
        return;
      }
      lastApiCallRef.current = now;

      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      const { terms, filters: searchFilters } = parseSearchQuery(search);
      const combinedFilters = combineFilters(filterState, searchFilters);

      if (terms) {
        params.append('search', terms);
      }

      Object.entries(combinedFilters).forEach(([filterType, values]) => {
        const valueArray = Array.isArray(values) ? values : [values];
        if (valueArray.length > 0) {
          valueArray.forEach(value => {
            params.append(filterType, value);
          });
        }
      });

      params.append('sortBy', sortField);
      params.append('sortOrder', sortDirection);

      params.append('page', page);
      params.append('limit', size);

      const response = await taskAPI.getTasks(params.toString());
      if (response.success) {
        if (Array.isArray(response.data)) {
          setTasks(response.data);
          setPagination({
            currentPage: 1,
            totalPages: 1,
            totalTasks: response.data.length,
            limit: size,
            hasNextPage: false,
            hasPrevPage: false
          });
        } else {
          setTasks(response.data.tasks || []);
          setPagination(response.data.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalTasks: 0,
            limit: size,
            hasNextPage: false,
            hasPrevPage: false
          });
        }

        if (search && search.trim().length >= 2) {
          recentSearchManager.add(search);
        }
      } else {
        throw new Error(response.error.message);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, filters, sortBy, sortOrder]);


  const handleFilterChange = useCallback((filterType, value, checked) => {
    const newFilters = {
      ...filters,
      [filterType]: checked
        ? [...filters[filterType], value]
        : filters[filterType].filter(item => item !== value)
    };
    setFilters(newFilters);
    setCurrentPage(1);
    fetchTasks(1, pageSize, searchTerm, newFilters, sortBy, sortOrder);
  }, [pageSize, searchTerm, filters, sortBy, sortOrder]);

  const clearAllFilters = useCallback(() => {
    const clearedFilters = {
      status: [],
      priority: [],
      category: [],
      assignees: [],
      dueDate: []
    };
    setFilters(clearedFilters);
    setCurrentPage(1);
    fetchTasks(1, pageSize, searchTerm, clearedFilters, sortBy, sortOrder);
  }, [pageSize, searchTerm, sortBy, sortOrder]);


  const handleSortChange = useCallback((newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
    fetchTasks(1, pageSize, searchTerm, filters, newSortBy, newSortOrder);
  }, [pageSize, searchTerm, filters]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    fetchTasks(page, pageSize, searchTerm, filters, sortBy, sortOrder);
  }, [pageSize, searchTerm, filters, sortBy, sortOrder]);

  const handlePageSizeChange = useCallback((newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    fetchTasks(1, newPageSize, searchTerm, filters, sortBy, sortOrder);
  }, [searchTerm, filters, sortBy, sortOrder]);

  const handleStatusChange = useCallback(async (taskId, newStatus, recurringScope = null) => {
    try {
      const response = await taskAPI.updateTaskStatus(taskId, newStatus, recurringScope);
      if (!response.success) {
        throw new Error(response.error.message);
      }
      fetchTasks(currentPage, pageSize, searchTerm, filters, sortBy, sortOrder);
      taskToast.statusChanged(newStatus);
    } catch (err) {
      console.error('Error updating task status:', err);
      setError(err.message || 'Failed to update task status');
    }
  }, [currentPage, pageSize, searchTerm, filters, sortBy, sortOrder]);

  const handleTaskEdit = useCallback((task, recurringScope = null) => {
    if (recurringScope) {
      setEditingTask({ ...task, _recurringScope: recurringScope });
    } else {
      setEditingTask(task);
    }
    setTaskFormMode('edit');
    setIsTaskFormOpen(true);
  }, []);

  const handleCreateTask = useCallback(() => {
    setEditingTask(null);
    setTaskFormMode('create');
    setIsTaskFormOpen(true);
  }, []);

  const handleTaskFormClose = useCallback((updatedTask) => {
    setIsTaskFormOpen(false);
    setEditingTask(null);
    setTaskFormMode('create');

    if (updatedTask) {
      fetchTasks(currentPage, pageSize, searchTerm, filters, sortBy, sortOrder);
    }
  }, [currentPage, pageSize, searchTerm, filters, sortBy, sortOrder]);

  const handleTaskDelete = useCallback(async (taskId, recurringScope = null) => {
    try {
      const response = await taskAPI.deleteTask(taskId, recurringScope);
      if (!response.success) {
        throw new Error(response.error.message);
      }
      fetchTasks(currentPage, pageSize, searchTerm, filters, sortBy, sortOrder);
      taskToast.deleted();
    } catch (err) {
      console.error('Error deleting task:', err);
      setError(err.message || 'Failed to delete task');
    }
  }, [currentPage, pageSize, searchTerm, filters, sortBy, sortOrder]);

  const getTaskStats = () => {
    const stats = {
      total: pagination.totalTasks || tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      done: tasks.filter(t => t.status === 'done').length,
      overdue: tasks.filter(t => {
        if (!t.dueDate || t.status === 'done') return false;
        return new Date(t.dueDate) < new Date();
      }).length,
    };

    stats.completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

    return stats;
  };

  const TaskListSkeleton = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Skeleton className="h-10 w-full sm:max-w-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-12" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className={cn(
        "gap-4",
        viewMode === 'grid'
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          : "flex flex-col space-y-3"
      )}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-10 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <TaskListSkeleton />
      </div>
    );
  }

  const taskStats = getTaskStats();

  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-gray-600 mt-2">
              {taskStats.total} tasks • {taskStats.completionRate}% complete
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">

        <div className="flex border rounded-lg overflow-hidden">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="rounded-none border-0  px-4"
          >
            <List className="h-5 w-5" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="rounded-none border-0 px-4"
          >
            <Grid3X3 className="h-5 w-5" />
          </Button>
        </div>

        <TaskSort
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />

        <TaskFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearAllFilters}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {tasks.length === 0 && !loading && !error ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckSquare2 className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm ? 'No tasks found' : 'No tasks yet'}
          </h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {searchTerm
              ? `No tasks match "${searchTerm}". Try adjusting your search.`
              : 'Create your first task to start organizing your work better.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
                {displayTasks.map((task) => (
                  <TaskGridCard
                    key={task._id}
                    task={task}
                    searchTerm={searchTerm}
                    onStatusChange={handleStatusChange}
                    onEdit={handleTaskEdit}
                    onDelete={handleTaskDelete}
                  />
                ))}
              </div>
            ) : (
              <TaskTable
                tasks={displayTasks}
                searchTerm={searchTerm}
                onStatusChange={handleStatusChange}
                onEdit={handleTaskEdit}
                onDelete={handleTaskDelete}
              />
            )}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                showInfo={true}
                showPageSize={true}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            </div>
          )}
        </div>
      )}

      <TaskForm
        isOpen={isTaskFormOpen}
        onClose={handleTaskFormClose}
        task={editingTask}
        mode={taskFormMode}
      />
    </div>
  );
};

export default TaskList;