import React, { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  UserPlus, 
  Calendar,
  Check,
  Trash2,
  MoreHorizontal
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent } from '../components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import UserAvatar from '../components/UserAvatar'
import { useNotifications } from '../hooks/useNotifications'

const NotificationsPage = () => {
  const { 
    notifications, 
    unreadCount,
    isLoading,
    markAsRead, 
    markAllAsRead, 
    deleteNotification
  } = useNotifications()

  const [filter, setFilter] = useState('all') // all, unread, read

  const getNotificationIcon = (type) => {
    const iconProps = { className: "h-5 w-5" }
    
    switch (type) {
      case 'task_assigned':
      case 'shared_task':
        return <UserPlus {...iconProps} className="h-5 w-5 text-blue-500" />
      case 'task_completed':
        return <CheckCircle {...iconProps} className="h-5 w-5 text-green-500" />
      case 'task_overdue':
      case 'overdue':
        return <AlertCircle {...iconProps} className="h-5 w-5 text-red-500" />
      case 'reminder':
        return <Calendar {...iconProps} className="h-5 w-5 text-orange-500" />
      default:
        return <Bell {...iconProps} className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getNotificationTypeColor = (type) => {
    switch (type) {
      case 'task_assigned':
      case 'shared_task':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800'
      case 'task_completed':
        return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
      case 'task_overdue':
      case 'overdue':
        return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
      case 'reminder':
        return 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800'
      default:
        return 'bg-muted/30 border-border'
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.isRead
      case 'read':
        return notification.isRead
      default:
        return true
    }
  })

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id)
    }
  }

  const handleMarkAsRead = async (e, notificationId) => {
    e.stopPropagation()
    await markAsRead(notificationId)
  }

  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation()
    await deleteNotification(notificationId)
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-600 mt-1">
            Stay updated with your tasks and activities
          </p>
        </div>
        
        {unreadCount > 0 && (
          <Button 
            onClick={handleMarkAllAsRead}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Check className="h-4 w-4 mr-2" />
            Mark all as read ({unreadCount})
          </Button>
        )}
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          <TabsTrigger value="read">Read ({notifications.length - unreadCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'unread' ? 'No unread notifications' : 
                 filter === 'read' ? 'No read notifications' : 'No notifications'}
              </h3>
              <p className="text-gray-600">
                {filter === 'unread' ? 'All caught up! You have no unread notifications.' :
                 filter === 'read' ? 'No notifications have been read yet.' :
                 'You\'ll see task updates and reminders here when they arrive.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {filteredNotifications.map((notification) => (
                <div 
                  key={notification._id}
                  className={`group relative rounded-xl border-2 transition-all duration-200 cursor-pointer bg-white shadow-sm hover:shadow-md ${
                    !notification.isRead 
                      ? `${getNotificationTypeColor(notification.type)} border-l-4` 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 flex items-center justify-center shadow-sm">
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-3">
                          <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1 leading-relaxed line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <p className="text-xs text-gray-500 font-medium">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </p>
                            {notification.relatedTask && (
                              <Badge variant="outline" className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border-blue-200">
                                Task
                              </Badge>
                            )}
                            {!notification.isRead && (
                              <Badge variant="secondary" className="text-xs px-2 py-1 bg-green-50 text-green-700 border-green-200">
                                New
                              </Badge>
                            )}
                          </div>
                        </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isLoading}
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!notification.isRead && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={(e) => handleMarkAsRead(e, notification._id)}
                                    disabled={isLoading}
                                  >
                                    <Check className="h-4 w-4 mr-2" />
                                    Mark as read
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem 
                                onClick={(e) => handleDeleteNotification(e, notification._id)}
                                disabled={isLoading}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default NotificationsPage