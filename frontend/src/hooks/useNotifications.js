import { useEffect, useCallback } from 'react'
import { useNotificationStore } from '../stores'
import { notificationAPI } from '../lib/api'
import { toast } from '../lib/toast'

export const useNotifications = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    setNotifications,
    setLoading,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotificationStore()

  const fetchNotifications = useCallback(async (options = {}) => {
    try {
      setLoading(true)
      const result = await notificationAPI.getNotifications(options)
      
      if (result.success) {
        setNotifications(result.data.notifications)
        return result.data
      } else {
        toast.error('Failed to fetch notifications')
        return null
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      toast.error('Failed to fetch notifications')
      return null
    } finally {
      setLoading(false)
    }
  }, [setNotifications, setLoading])

  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await notificationAPI.getUnreadCount()
      
      if (result.success) {
        useNotificationStore.setState({ unreadCount: result.data.unreadCount })
        return result.data.unreadCount
      }
      return 0
    } catch (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }
  }, [])

  const handleMarkAsRead = useCallback(async (notificationId) => {
    try {
      setLoading(true)
      const result = await notificationAPI.markAsRead(notificationId)
      
      if (result.success) {
        markAsRead(notificationId)
        return true
      } else {
        toast.error('Failed to mark notification as read')
        return false
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error('Failed to mark notification as read')
      return false
    } finally {
      setLoading(false)
    }
  }, [markAsRead, setLoading])

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      setLoading(true)
      const result = await notificationAPI.markAllAsRead()
      
      if (result.success) {
        markAllAsRead()
        toast.success('All notifications marked as read')
        return true
      } else {
        toast.error('Failed to mark all notifications as read')
        return false
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast.error('Failed to mark all notifications as read')
      return false
    } finally {
      setLoading(false)
    }
  }, [markAllAsRead, setLoading])

  const handleDeleteNotification = useCallback(async (notificationId) => {
    try {
      setLoading(true)
      const result = await notificationAPI.deleteNotification(notificationId)
      
      if (result.success) {
        deleteNotification(notificationId)
        toast.success('Notification deleted')
        return true
      } else {
        toast.error('Failed to delete notification')
        return false
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('Failed to delete notification')
      return false
    } finally {
      setLoading(false)
    }
  }, [deleteNotification, setLoading])

  const createNotification = useCallback(async (notificationData) => {
    try {
      setLoading(true)
      const result = await notificationAPI.createNotification(notificationData)
      
      if (result.success) {
        addNotification(result.data.notification)
        toast.success('Notification created')
        return result.data.notification
      } else {
        toast.error('Failed to create notification')
        return null
      }
    } catch (error) {
      console.error('Error creating notification:', error)
      toast.error('Failed to create notification')
      return null
    } finally {
      setLoading(false)
    }
  }, [addNotification, setLoading])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const startPolling = useCallback((interval = 30000) => {
    const pollInterval = setInterval(() => {
      fetchUnreadCount()
    }, interval)

    return () => clearInterval(pollInterval)
  }, [fetchUnreadCount])

  return {
    notifications,
    unreadCount,
    isLoading,
    
    fetchNotifications,
    fetchUnreadCount,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDeleteNotification,
    createNotification,
    
    startPolling
  }
}

export default useNotifications