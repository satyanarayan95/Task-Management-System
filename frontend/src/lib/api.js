import axios from 'axios'
import { useAuthStore } from '../stores'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500/api'
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  async (config) => {
    const { accessToken, needsTokenRefresh, refreshAccessToken, isRefreshing } = useAuthStore.getState()

    if (config.url === '/tasks' && config.method === 'post') {
      console.log('=== AXIOS TASK CREATION REQUEST ===');
      console.log('URL:', config.baseURL + config.url);
      console.log('Headers:', config.headers);
      console.log('Data:', JSON.stringify(config.data, null, 2));
    }

    if (accessToken) {
      if (!isRefreshing && needsTokenRefresh()) {
        try {
          const newToken = await refreshAccessToken()
          config.headers.Authorization = `Bearer ${newToken}`
        } catch (error) {
          console.error('Token refresh failed in interceptor:', error)
          if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`
          }
        }
      } else {
        config.headers.Authorization = `Bearer ${accessToken}`
      }
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      const { accessToken, refreshToken, refreshAccessToken, logout } = useAuthStore.getState()
      
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register')) {
        return Promise.reject(error)
      }
      
      if (refreshToken && !originalRequest.url?.includes('/auth/refresh')) {
        originalRequest._retry = true
        
        try {
          console.log('Attempting token refresh due to 401 response')
          const newToken = await refreshAccessToken()
          
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError)
          
          if (refreshError.message?.includes('REFRESH_TOKEN_EXPIRED') || 
              refreshError.message?.includes('INVALID_REFRESH_TOKEN') ||
              refreshError.message?.includes('No refresh token available')) {
            console.log('Refresh token expired, logging out user')
            logout()
            window.location.href = '/login'
          } else {
            console.warn('Token refresh failed but continuing with current token')
          }
        }
      } else {
        console.log('No refresh token available or refresh request failed, logging out')
        logout()
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

export const handleApiError = (error) => {
  if (error.response) {
    const { status, data } = error.response
    return {
      message: data.message || data.error || `Server error: ${status}`,
      status,
      errors: data.errors || [],
      details: data.details || [] // Support new detailed error format
    }
  } else if (error.request) {
    return {
      message: 'Network error. Please check your connection.',
      status: 0,
      errors: [],
      details: []
    }
  } else {
    return {
      message: error.message || 'An unexpected error occurred',
      status: 0,
      errors: [],
      details: []
    }
  }
}

export const authAPI = {
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
      return { success: true }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  refreshToken: async () => {
    try {
      const response = await api.post('/auth/refresh')
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile')
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  updateProfile: async (userData) => {
    try {
      const response = await api.put('/auth/profile', userData)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  }
}

export const taskAPI = {
  getTasks: async (params = {}) => {
    try {
      const queryString = typeof params === 'string' ? params : 
        new URLSearchParams(params).toString();
      
      const response = await api.get(`/tasks${queryString ? `?${queryString}` : ''}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: handleApiError(error) };
    }
  },

  getTask: async (id) => {
    try {
      const response = await api.get(`/tasks/${id}`)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  createTask: async (taskData) => {
    try {
      const response = await api.post('/tasks', taskData)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  updateTask: async (id, taskData, recurringScope = null) => {
    try {
      const data = { ...taskData };
      if (recurringScope) {
        data.recurringScope = recurringScope;
      }
      const response = await api.put(`/tasks/${id}`, data)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  deleteTask: async (id, recurringScope = null) => {
    try {
      const config = {};
      if (recurringScope) {
        config.data = { recurringScope };
      }
      const response = await api.delete(`/tasks/${id}`, config)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  searchTasks: async (query) => {
    try {
      const response = await api.get(`/tasks/search?q=${encodeURIComponent(query)}`)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  updateTaskStatus: async (id, status, recurringScope = null) => {
    try {
      const data = { status };
      if (recurringScope) {
        data.recurringScope = recurringScope;
      }
      const response = await api.patch(`/tasks/${id}/status`, data)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  assignTask: async (id, assigneeIds) => {
    try {
      const response = await api.patch(`/tasks/${id}/assign`, { assignees: assigneeIds })
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  shareTask: async (id, shareData) => {
    try {
      const response = await api.post(`/tasks/${id}/share`, shareData)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  getCategories: async () => {
    try {
      const response = await api.get('/categories')
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  getUsers: async (search = '') => {
    try {
      const params = search ? { search } : {};
      const response = await api.get('/users', { params })
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  getActivities: async (params = {}) => {
    try {
      const response = await api.get('/activities', { params })
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  getTaskActivities: async (taskId, params = {}) => {
    try {
      const response = await api.get(`/activities/task/${taskId}`, { params })
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  logout: async () => {
    try {
      const response = await api.post('/auth/logout')
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  logoutAll: async () => {
    try {
      const response = await api.post('/auth/logout-all')
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  refreshToken: async (refreshToken) => {
    try {
      const response = await api.post('/auth/refresh', { refreshToken })
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile')
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  getFilterOptions: async () => {
    try {
      const response = await api.get('/tasks/filters')
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  }
}

export const categoryAPI = {
  getCategories: async () => {
    try {
      const response = await api.get('/categories')
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  getCategory: async (id) => {
    try {
      const response = await api.get(`/categories/${id}`)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  createCategory: async (categoryData) => {
    try {
      const response = await api.post('/categories', categoryData)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  updateCategory: async (id, categoryData) => {
    try {
      const response = await api.put(`/categories/${id}`, categoryData)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  deleteCategory: async (id) => {
    try {
      const response = await api.delete(`/categories/${id}`)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  }
}

export const notificationAPI = {
  getNotifications: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString()
      const response = await api.get(`/notifications${queryString ? `?${queryString}` : ''}`)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  getUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/unread-count')
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  markAsRead: async (id) => {
    try {
      const response = await api.patch(`/notifications/${id}/read`)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  markAllAsRead: async () => {
    try {
      const response = await api.patch('/notifications/read-all')
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  deleteNotification: async (id) => {
    try {
      const response = await api.delete(`/notifications/${id}`)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  createNotification: async (notificationData) => {
    try {
      const response = await api.post('/notifications', notificationData)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  }
}

export default api