import { notificationAPI } from '../lib/api'

export const createNotification = async (notificationData) => {
  try {
    const response = await notificationAPI.createNotification(notificationData)
    return response
  } catch (error) {
    console.error('Error creating notification:', error)
    return { success: false, error }
  }
}

export const formatNotificationTime = (createdAt) => {
  const now = new Date()
  const notificationTime = new Date(createdAt)
  const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60))
  
  if (diffInMinutes < 1) {
    return 'Just now'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  } else if (diffInMinutes < 1440) { // 24 hours
    const hours = Math.floor(diffInMinutes / 60)
    return `${hours}h ago`
  } else {
    const days = Math.floor(diffInMinutes / 1440)
    return `${days}d ago`
  }
}

export const getNotificationPriority = (type) => {
  const priorities = {
    'task_overdue': 3,
    'reminder': 2,
    'task_assigned': 2,
    'shared_task': 2,
    'task_completed': 1
  }
  
  return priorities[type] || 1
}

export const sortNotifications = (notifications) => {
  return notifications.sort((a, b) => {
    if (a.isRead !== b.isRead) {
      return a.isRead ? 1 : -1
    }
    
    const priorityDiff = getNotificationPriority(b.type) - getNotificationPriority(a.type)
    if (priorityDiff !== 0) {
      return priorityDiff
    }
    
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
}

export default {
  createNotification,
  formatNotificationTime,
  getNotificationPriority,
  sortNotifications
}