import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Progress } from '../components/ui/progress'
import TaskForm from '../components/TaskForm'
import { cn } from '../lib/utils'
import { taskAPI } from '../lib/api'
import { 
  CheckSquare2, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  Eye,
  Coffee,
  RefreshCw,
  Activity as ActivityIcon,
  MessageSquare,
  FolderKanban,
  Calendar,
  Edit,
  Trash2,
  CheckCircle,
  User,
  Target
} from 'lucide-react'

const DashboardPage = () => {
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [dashboardData, setDashboardData] = useState({
    tasks: [],
    activities: [],
    loading: true,
    error: null
  })

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour >= 0 && hour < 4) {
      setGreeting('Hello')
    } else if (hour >= 4 && hour < 12) {
      setGreeting('Good morning')
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good afternoon')
    } else if (hour >= 17 && hour < 21) {
      setGreeting('Good evening')
    } else if (hour >= 21 && hour < 24) {
      setGreeting('Good night')
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true, error: null }))
      
      const [tasksResult, activitiesResult] = await Promise.all([
        taskAPI.getTasks({ limit: 100 }), // Get more tasks for better stats
        taskAPI.getActivities({ limit: 5 }) // Get top 5 activities
      ])

      if (tasksResult.success && activitiesResult.success) {
        setDashboardData({
          tasks: tasksResult.data.tasks || [],
          activities: activitiesResult.data.data?.activities || [],
          loading: false,
          error: null
        })
      } else {
        setDashboardData(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to fetch dashboard data'
        }))
      }
    } catch (error) {
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to fetch dashboard data'
      }))
    }
  }

  const apiTasks = dashboardData.tasks
  const totalTasks = apiTasks.length
  const completedTasks = apiTasks.filter(t => t.status === 'done').length
  const inProgressTasks = apiTasks.filter(t => t.status === 'in_progress').length
  const todoTasks = apiTasks.filter(t => t.status === 'todo').length
  
  const today = new Date()
  const todayTasks = apiTasks.filter(t => {
    if (!t.dueDate) return false
    const dueDate = new Date(t.dueDate)
    return dueDate.toDateString() === today.toDateString() && t.status !== 'done'
  })
  
  const overdueTasks = apiTasks.filter(t => {
    if (!t.dueDate) return false
    const dueDate = new Date(t.dueDate)
    return dueDate < today && t.status !== 'done'
  })
  
  const upcomingTasks = apiTasks.filter(t => {
    if (!t.dueDate) return false
    const dueDate = new Date(t.dueDate)
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    return dueDate > today && dueDate <= threeDaysFromNow && t.status !== 'done'
  })

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const taskSections = [
    {
      title: 'My Tasks',
      count: totalTasks,
      icon: CheckSquare2,
      path: '/tasks',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'All your tasks'
    },
    {
      title: 'Today',
      count: todayTasks.length,
      icon: Calendar,
      path: '/tasks/today',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Due today'
    },
    {
      title: 'Upcoming',
      count: upcomingTasks.length,
      icon: Clock,
      path: '/tasks?filter=upcoming',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Next 3 days'
    },
    {
      title: 'Overdue',
      count: overdueTasks.length,
      icon: AlertCircle,
      path: '/tasks?filter=overdue',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: 'Past due'
    }
  ]

  const getActivityIcon = (type) => {
    switch (type) {
      case 'task_created':
        return <CheckSquare2 className="h-4 w-4 text-green-600" />
      case 'task_updated':
        return <Edit className="h-4 w-4 text-blue-600" />
      case 'task_deleted':
        return <Trash2 className="h-4 w-4 text-red-600" />
      case 'task_completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'task_assigned':
        return <User className="h-4 w-4 text-purple-600" />
      case 'task_status_changed':
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      case 'task_priority_changed':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'task_due_date_changed':
        return <Calendar className="h-4 w-4 text-indigo-600" />
      case 'task_shared':
        return <User className="h-4 w-4 text-green-600" />
      case 'task_unshared':
        return <User className="h-4 w-4 text-red-600" />
      case 'category_created':
      case 'category_updated':
      case 'category_deleted':
        return <FolderKanban className="h-4 w-4 text-orange-600" />
      case 'comment_added':
        return <MessageSquare className="h-4 w-4 text-blue-600" />
      default:
        return <ActivityIcon className="h-4 w-4 text-gray-600" />
    }
  }

  const formatTimeAgo = (date) => {
    const now = new Date()
    const activityDate = new Date(date)
    const diffInSeconds = Math.floor((now - activityDate) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    return activityDate.toLocaleDateString()
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{greeting}! 👋</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Ready to tackle your goals? Let&apos;s make today productive.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {taskSections.map((section) => {
          const Icon = section.icon
          return (
            <Link
              key={section.title}
              to={section.path}
              className="group p-3 sm:p-4 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition-colors">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-medium text-gray-900 truncate">{section.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{section.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:flex-col sm:text-right">
                  <div className="text-lg sm:text-2xl font-bold text-gray-900">
                    {dashboardData.loading ? (
                      <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-gray-400" />
                    ) : (
                      section.count
                    )}
                  </div>
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {!dashboardData.loading && totalTasks > 0 && (
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Progress</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-1.5 bg-gray-200 mb-3" />
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="px-2 py-1 rounded-md bg-green-50">
                <div className="text-sm font-semibold text-green-600">{completedTasks}</div>
                <div className="text-xs text-green-600">Done</div>
              </div>
              <div className="px-2 py-1 rounded-md bg-blue-50">
                <div className="text-sm font-semibold text-blue-600">{inProgressTasks}</div>
                <div className="text-xs text-blue-600">Active</div>
              </div>
              <div className="px-2 py-1 rounded-md bg-gray-50">
                <div className="text-sm font-semibold text-gray-600">{todoTasks}</div>
                <div className="text-xs text-gray-600">Todo</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Recent Activity</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchDashboardData}
                disabled={dashboardData.loading}
                className="h-6 w-6 p-0 text-gray-600 hover:text-gray-900"
              >
                <RefreshCw className={cn("h-3 w-3", dashboardData.loading && "animate-spin")} />
              </Button>
              <Link to="/activity">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-gray-600 hover:text-gray-900">
                  View All
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
          
          {dashboardData.loading ? (
            <div className="text-center py-4">
              <RefreshCw className="mx-auto h-6 w-6 text-gray-400 mb-2 animate-spin" />
              <p className="text-xs text-gray-500">Loading...</p>
            </div>
          ) : dashboardData.error ? (
            <div className="text-center py-4">
              <AlertCircle className="mx-auto h-6 w-6 text-red-400 mb-2" />
              <p className="text-xs text-red-600 mb-2">{dashboardData.error}</p>
              <Button size="sm" onClick={fetchDashboardData} className="h-6 px-2 text-xs">Retry</Button>
            </div>
          ) : dashboardData.activities.length > 0 ? (
            <div className="space-y-2">
              {dashboardData.activities.map((activity) => (
                <div key={activity._id} className="flex items-start gap-2 p-2 rounded-md hover:bg-gray-50 transition-colors">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 leading-tight mb-1 line-clamp-2">
                      {activity.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {activity.user ? activity.user.fullName : 'System'} • {formatTimeAgo(activity.createdAt)}
                      </p>
                      {activity.task && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5 ml-2 flex-shrink-0">
                          {activity.task.title.length > 15 ? activity.task.title.substring(0, 15) + '...' : activity.task.title}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <Coffee className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">No activities yet</h3>
              <p className="text-xs text-gray-500">Start creating tasks to see activity here!</p>
            </div>
          )}
        </CardContent>
      </Card>

      <TaskForm
        isOpen={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        mode="create"
      />
    </div>
  )
}

export default DashboardPage