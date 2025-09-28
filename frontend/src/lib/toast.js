import { toast as sonnerToast } from 'sonner'

export const toast = {
  success: (message, options = {}) => {
    sonnerToast.success(message, {
      duration: 4000,
      ...options
    })
  },

  error: (message, options = {}) => {
    sonnerToast.error(message, {
      duration: 6000,
      ...options
    })
  },

  warning: (message, options = {}) => {
    sonnerToast.warning(message, {
      duration: 5500,
      ...options
    })
  },

  info: (message, options = {}) => {
    sonnerToast.info(message, {
      duration: 4000,
      ...options
    })
  },

  loading: (message, options = {}) => {
    return sonnerToast.loading(message, {
      duration: Infinity,
      ...options
    })
  },

  promise: (promise, messages, options = {}) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading || 'Loading...',
      success: messages.success || 'Success!',
      error: messages.error || 'Something went wrong',
      duration: 4000,
      ...options
    })
  },

  dismiss: (toastId) => {
    sonnerToast.dismiss(toastId)
  },

  dismissAll: () => {
    sonnerToast.dismiss()
  }
}

export const apiToast = {
  handleResponse: (response, successMessage, errorMessage) => {
    if (response.success) {
      toast.success(successMessage || 'Operation completed successfully')
      return response.data
    } else {
      const message = response.error?.message || errorMessage || 'An error occurred'
      toast.error(message)
      throw new Error(message)
    }
  },

  handlePromise: (promise, messages) => {
    return toast.promise(promise, {
      loading: messages.loading || 'Processing...',
      success: (data) => {
        if (data.success) {
          return messages.success || 'Operation completed successfully'
        }
        throw new Error(data.error?.message || 'Operation failed')
      },
      error: (error) => {
        return error.message || messages.error || 'Something went wrong'
      }
    })
  },

  validationError: (errors) => {
    if (Array.isArray(errors)) {
      errors.forEach(error => {
        toast.error(`${error.field}: ${error.message}`)
      })
    } else if (typeof errors === 'object') {
      Object.entries(errors).forEach(([field, message]) => {
        toast.error(`${field}: ${message}`)
      })
    } else {
      toast.error(errors || 'Validation failed')
    }
  }
}

export const taskToast = {
  created: () => toast.success('Task created successfully'),
  updated: () => toast.success('Task updated successfully'),
  deleted: () => toast.success('Task deleted successfully'),
  statusChanged: (status) => toast.success(`Task marked as ${status.replace('_', ' ')}`),
  assigned: (assignee) => toast.success(`Task assigned to ${assignee}`),
  shared: () => toast.success('Task shared successfully'),
  
  createError: () => toast.error('Failed to create task'),
  updateError: () => toast.error('Failed to update task'),
  deleteError: () => toast.error('Failed to delete task'),
  loadError: () => toast.error('Failed to load tasks')
}

export const categoryToast = {
  created: () => toast.success('Category created successfully'),
  updated: () => toast.success('Category updated successfully'),
  deleted: () => toast.success('Category deleted successfully'),
  
  createError: () => toast.error('Failed to create category'),
  updateError: () => toast.error('Failed to update category'),
  deleteError: () => toast.error('Failed to delete category'),
  loadError: () => toast.error('Failed to load categories')
}

export const authToast = {
  loginSuccess: () => toast.success('Welcome back!'),
  logoutSuccess: () => toast.success('Logged out successfully'),
  registerSuccess: () => toast.success('Account created successfully'),
  profileUpdated: () => toast.success('Profile updated successfully'),
  
  loginError: () => toast.error('Invalid email or password'),
  registerError: () => toast.error('Failed to create account'),
  profileError: () => toast.error('Failed to update profile'),
  sessionExpired: () => toast.error('Session expired. Please log in again.')
}

export default toast