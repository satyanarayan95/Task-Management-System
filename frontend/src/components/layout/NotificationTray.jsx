import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import {
  Bell,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Calendar,
  MoreHorizontal,
  Check,
  Trash2,
  CheckSquare2,
  Edit
} from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { useNotifications } from '../../hooks/useNotifications'

const NotificationTray = () => {
  const navigate = useNavigate()
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications()

  const getNotificationIcon = (type) => {
    const iconProps = { className: "h-4 w-4" }

    switch (type) {
      case 'task_assigned':
      case 'shared_task':
        return <UserPlus {...iconProps} className="text-blue-500" />
      case 'task_completed':
        return <CheckCircle {...iconProps} className="text-green-500" />
      case 'task_overdue':
      case 'overdue':
        return <AlertCircle {...iconProps} className="text-red-500" />
      case 'reminder':
        return <Calendar {...iconProps} className="text-orange-500" />
      case 'task_created':
        return <CheckSquare2 {...iconProps} className="text-purple-500" />
      case 'task_updated':
        return <Edit {...iconProps} className="text-indigo-500" />
      case 'task_deleted':
        return <Trash2 {...iconProps} className="text-red-600" />
      default:
        return <Bell {...iconProps} className="text-muted-foreground" />
    }
  }

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id)
    }

    if (notification.relatedTask) {
      navigate(`/tasks?task=${notification.relatedTask}`)
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
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-10 w-10 px-0 relative border border-gray-200 hover:border-gray-300">
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs font-semibold flex items-center justify-center bg-red-500 text-white border-2 border-white shadow-sm"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">
            Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0 mr-4"
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {notifications.some(n => !n.isRead) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isLoading}
              className="text-xs h-8 px-2"
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">No notifications</p>
                  <p className="text-xs text-muted-foreground">
                    You&apos;ll see updates here
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.slice(0, 6).map((notification) => (
                <div
                  key={notification._id}
                  className={`group relative px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors ${!notification.isRead ? 'bg-blue-50/50 border-l-2 border-blue-500' : ''
                    }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0">
                      <div className="h-5 w-5 flex items-center justify-center">
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleMarkAsRead(e, notification._id)}
                          disabled={isLoading}
                          className="h-5 w-5 p-0"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isLoading}
                            className="h-5 w-5 p-0"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!notification.isRead && (
                            <DropdownMenuItem
                              onClick={(e) => handleMarkAsRead(e, notification._id)}
                              disabled={isLoading}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Mark as read
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={(e) => handleDeleteNotification(e, notification._id)}
                            disabled={isLoading}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {!notification.isRead && (
                    <div className="absolute top-1 right-1">
                      <div className="h-1.5 w-1.5 bg-blue-500 rounded-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-3 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/notifications')}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

export default NotificationTray