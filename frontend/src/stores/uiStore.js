import { create } from 'zustand'

const useUIStore = create((set) => ({
  isLoading: false,
  isMobileMenuOpen: false,
  theme: 'light', // 'light' or 'dark'

  modals: {
    taskForm: false,
    categoryForm: false,
    deleteConfirm: false,
    profileSettings: false
  },

  toasts: [],

  setLoading: (loading) => set({ isLoading: loading }),

  toggleMobileMenu: () => set((state) => ({
    isMobileMenuOpen: !state.isMobileMenuOpen
  })),

  closeMobileMenu: () => set({ isMobileMenuOpen: false }),

  toggleTheme: () => set((state) => ({
    theme: state.theme === 'light' ? 'dark' : 'light'
  })),

  openModal: (modalName) => set((state) => ({
    modals: { ...state.modals, [modalName]: true }
  })),

  closeModal: (modalName) => set((state) => ({
    modals: { ...state.modals, [modalName]: false }
  })),

  closeAllModals: () => set((state) => ({
    modals: Object.keys(state.modals).reduce((acc, key) => {
      acc[key] = false
      return acc
    }, {})
  })),

  addToast: (toast) => set((state) => ({
    toasts: [...state.toasts, { ...toast, id: Date.now() }]
  })),

  removeToast: (toastId) => set((state) => ({
    toasts: state.toasts.filter(toast => toast.id !== toastId)
  })),

  clearToasts: () => set({ toasts: [] })
}))

export default useUIStore