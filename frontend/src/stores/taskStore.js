import { create } from 'zustand'

const useTaskStore = create((set, get) => ({
  tasks: [],
  categories: [],
  isLoading: false,
  error: null,

  searchQuery: '',
  filters: {
    status: 'all', // 'all', 'todo', 'in_progress', 'done'
    priority: 'all', // 'all', 'low', 'medium', 'high', 'urgent'
    category: 'all', // 'all' or category ID
    assignees: 'all', // 'all' or user ID
    dueDate: 'all' // 'all', 'today', 'week', 'overdue'
  },

  selectedTask: null,
  isTaskFormOpen: false,
  taskFormMode: 'create', // 'create' or 'edit'

  setTasks: (tasks) => set({ tasks }),
  
  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, task]
  })),

  updateTask: (taskId, updates) => set((state) => ({
    tasks: state.tasks.map(task => 
      task._id === taskId ? { ...task, ...updates } : task
    )
  })),

  deleteTask: (taskId) => set((state) => ({
    tasks: state.tasks.filter(task => task._id !== taskId)
  })),

  setCategories: (categories) => set({ categories }),

  addCategory: (category) => set((state) => ({
    categories: [...state.categories, category]
  })),

  updateCategory: (categoryId, updates) => set((state) => ({
    categories: state.categories.map(category =>
      category._id === categoryId ? { ...category, ...updates } : category
    )
  })),

  deleteCategory: (categoryId) => set((state) => ({
    categories: state.categories.filter(category => category._id !== categoryId)
  })),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setFilter: (filterType, value) => set((state) => ({
    filters: { ...state.filters, [filterType]: value }
  })),

  clearFilters: () => set({
    searchQuery: '',
    filters: {
      status: 'all',
      priority: 'all',
      category: 'all',
      assignees: 'all',
      dueDate: 'all'
    }
  }),

  setSelectedTask: (task) => set({ selectedTask: task }),

  openTaskForm: (mode = 'create', task = null) => set({
    isTaskFormOpen: true,
    taskFormMode: mode,
    selectedTask: task
  }),

  closeTaskForm: () => set({
    isTaskFormOpen: false,
    taskFormMode: 'create',
    selectedTask: null
  }),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  getFilteredTasks: () => {
    const { tasks, searchQuery, filters } = get()
    
    return tasks.filter(task => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      if (filters.status !== 'all' && task.status !== filters.status) {
        return false
      }

      if (filters.priority !== 'all' && task.priority !== filters.priority) {
        return false
      }

      if (filters.category !== 'all' && task.category?._id !== filters.category) {
        return false
      }

      if (filters.assignees !== 'all' && !task.assignees?.some(assignee => assignee._id === filters.assignees)) {
        return false
      }

      if (filters.dueDate !== 'all') {
        const now = new Date()
        const taskDue = new Date(task.dueDate)
        
        switch (filters.dueDate) {
          case 'today':
            if (taskDue.toDateString() !== now.toDateString()) return false
            break
          case 'week': {
            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
            if (taskDue > weekFromNow) return false
            break
          }
          case 'overdue':
            if (taskDue >= now || task.status === 'done') return false
            break
        }
      }

      return true
    })
  }
}))

export default useTaskStore