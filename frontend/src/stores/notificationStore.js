import { create } from 'zustand'
import { sortNotifications } from '../lib/notificationUtils'

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  isTrayOpen: false,

  setNotifications: (notifications) => {
    const sortedNotifications = sortNotifications(notifications)
    const unreadCount = sortedNotifications.filter(n => !n.isRead).length
    set({ notifications: sortedNotifications, unreadCount })
  },

  addNotification: (notification) => set((state) => {
    const newNotifications = sortNotifications([notification, ...state.notifications])
    const unreadCount = newNotifications.filter(n => !n.isRead).length
    return {
      notifications: newNotifications,
      unreadCount
    }
  }),

  markAsRead: (notificationId) => set((state) => {
    const updatedNotifications = state.notifications.map(notification =>
      notification._id === notificationId 
        ? { ...notification, isRead: true }
        : notification
    )
    const unreadCount = updatedNotifications.filter(n => !n.isRead).length
    return {
      notifications: updatedNotifications,
      unreadCount
    }
  }),

  markAllAsRead: () => set((state) => {
    const updatedNotifications = state.notifications.map(notification => ({
      ...notification,
      isRead: true
    }))
    return {
      notifications: updatedNotifications,
      unreadCount: 0
    }
  }),

  deleteNotification: (notificationId) => set((state) => {
    const updatedNotifications = state.notifications.filter(
      notification => notification._id !== notificationId
    )
    const unreadCount = updatedNotifications.filter(n => !n.isRead).length
    return {
      notifications: updatedNotifications,
      unreadCount
    }
  }),

  toggleTray: () => set((state) => ({
    isTrayOpen: !state.isTrayOpen
  })),

  closeTray: () => set({ isTrayOpen: false }),

  setLoading: (loading) => set({ isLoading: loading })
}))

export default useNotificationStore