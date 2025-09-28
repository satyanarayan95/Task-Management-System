import React, { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Card, CardContent } from '../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { 
  Activity as ActivityIcon,
  RefreshCw,
  Calendar,
  ArrowRight,
  AlertCircle,
  Search,
  Filter,
  ExternalLink,
  CheckCircle,
  Edit,
  Trash2,
  CheckSquare2,
  FolderKanban,
  User,
  Clock,
  MessageSquare,
  AlertCircle as AlertIcon
} from 'lucide-react'
import { taskAPI } from '../lib/api'
import { cn } from '../lib/utils'
import UserAvatar from '../components/UserAvatar'

const ActivityPage = () => {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterUser, setFilterUser] = useState('all')
  const [filterDate, setFilterDate] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    fetchActivities()
  }, [currentPage, filterType, filterUser, filterDate])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      const params = {
        page: currentPage,
        limit: 20,
        type: filterType !== 'all' ? filterType : undefined,
        user: filterUser !== 'all' ? filterUser : undefined,
        date: filterDate !== 'all' ? filterDate : undefined,
        search: searchQuery || undefined
      }
      
      const result = await taskAPI.getActivities(params)
      
      if (result.success) {
        const activitiesData = result.data.data?.activities || [];
        
        if (currentPage === 1) {
          setActivities(activitiesData)
        } else {
          setActivities(prev => [...prev, ...activitiesData])
        }
        setHasMore(result.data.data?.hasMore || false)
      } else {
        setError(typeof result.error === 'string' ? result.error : 'Failed to fetch activities')
      }
    } catch (err) {
      setError('Failed to fetch activities')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setCurrentPage(1)
    fetchActivities()
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setFilterType('all')
    setFilterUser('all')
    setFilterDate('all')
    setCurrentPage(1)
  }

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1)
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'task_created':
        return <CheckSquare2 className="h-3 w-3 text-green-500" />
      case 'task_updated':
        return <Edit className="h-3 w-3 text-blue-500" />
      case 'task_deleted':
        return <Trash2 className="h-3 w-3 text-red-500" />
      case 'task_completed':
        return <CheckCircle className="h-3 w-3 text-green-600" />
      case 'task_assigned':
        return <User className="h-3 w-3 text-purple-500" />
      case 'task_status_changed':
        return <CheckCircle className="h-3 w-3 text-blue-600" />
      case 'task_priority_changed':
        return <AlertIcon className="h-3 w-3 text-yellow-500" />
      case 'task_due_date_changed':
        return <Calendar className="h-3 w-3 text-indigo-500" />
      case 'task_shared':
        return <User className="h-3 w-3 text-green-500" />
      case 'task_unshared':
        return <User className="h-3 w-3 text-red-500" />
      case 'category_created':
      case 'category_updated':
      case 'category_deleted':
        return <FolderKanban className="h-3 w-3 text-orange-500" />
      case 'comment_added':
        return <MessageSquare className="h-3 w-3 text-blue-500" />
      default:
        return <ActivityIcon className="h-3 w-3 text-gray-500" />
    }
  }

  const getActivityColor = (type) => {
    switch (type) {
      case 'task_created':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'task_updated':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'task_deleted':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'task_completed':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'task_assigned':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'task_status_changed':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'task_priority_changed':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'task_due_date_changed':
        return 'text-indigo-600 bg-indigo-50 border-indigo-200'
      case 'task_shared':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'task_unshared':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'category_created':
      case 'category_updated':
      case 'category_deleted':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'comment_added':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const groupActivitiesByDate = (activities) => {
    const groups = {}
    activities.forEach(activity => {
      const date = new Date(activity.createdAt).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(activity)
    })
    return groups
  }

  const activityGroups = groupActivitiesByDate(activities)

  const handleNavigateToTask = (taskId) => {
    window.location.href = `/tasks/${taskId}`
  }

  const handleNavigateToCategory = (categoryId) => {
    window.location.href = `/categories`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Activity Feed</h1>
              <p className="text-sm text-gray-500 mt-1">
                Track all activities across your workspace
              </p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchActivities()}
              disabled={loading}
              className="hover:bg-gray-50"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="task_created">Created</SelectItem>
                  <SelectItem value="task_updated">Updated</SelectItem>
                  <SelectItem value="task_completed">Completed</SelectItem>
                  <SelectItem value="task_deleted">Deleted</SelectItem>
                  <SelectItem value="task_assigned">Assigned</SelectItem>
                  <SelectItem value="task_status_changed">Status Changed</SelectItem>
                  <SelectItem value="task_priority_changed">Priority Changed</SelectItem>
                  <SelectItem value="task_due_date_changed">Due Date Changed</SelectItem>
                  <SelectItem value="task_shared">Shared</SelectItem>
                  <SelectItem value="task_unshared">Unshared</SelectItem>
                  <SelectItem value="category_created">Categories</SelectItem>
                  <SelectItem value="comment_added">Comments</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="me">Me</SelectItem>
                  <SelectItem value="others">Others</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterDate} onValueChange={setFilterDate}>
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="h-8 px-3 text-xs"
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={handleSearch}
                className="h-8 px-3 text-xs"
              >
                Search
              </Button>
            </div>
          </div>
        </div>

        {loading && activities.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-spin" />
                <p className="text-gray-500">Loading activities...</p>
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-400" />
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={fetchActivities}>Try Again</Button>
              </div>
            </CardContent>
          </Card>
        ) : activities.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <ActivityIcon className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
                <p className="text-gray-500">
                  {searchQuery || filterType !== 'all' || filterUser !== 'all' || filterDate !== 'all'
                    ? 'Try adjusting your filters to see more activities.'
                    : 'Start creating tasks and categories to see activity here.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(activityGroups).map(([date, dayActivities]) => (
              <div key={date}>
                <div className="flex items-center space-x-2 mb-3">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  <h3 className="text-xs font-medium text-gray-600">
                    {formatDate(date)}
                  </h3>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                    {dayActivities.length}
                  </Badge>
                </div>
                
                <div className="space-y-1.5">
                  {dayActivities.map((activity) => (
                    <div
                      key={activity._id}
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-all duration-200 hover:border-gray-300"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {activity.user ? (
                            <UserAvatar user={activity.user} size="md" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                              <User className="h-4 w-4 text-gray-500" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-medium text-gray-900">
                                {activity.user ? activity.user.fullName : 'System'}
                              </h4>
                              <Badge 
                                variant="outline" 
                                className={cn("text-xs px-2 py-0.5", getActivityColor(activity.type))}
                              >
                                {activity.type.replace('_', ' ')}
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-500 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTimeAgo(activity.createdAt)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                            {activity.description}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              {activity.task && (
                                <div className="flex items-center space-x-1">
                                  <CheckSquare2 className="h-3 w-3" />
                                  <span className="truncate max-w-40">{activity.task.title}</span>
                                </div>
                              )}
                              
                              {activity.category && (
                                <div className="flex items-center space-x-1">
                                  <FolderKanban className="h-3 w-3" />
                                  <span className="truncate max-w-32">{activity.category.name}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center space-x-1">
                              {activity.task && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleNavigateToTask(activity.task._id)}
                                  className="h-6 w-6 p-0 hover:bg-gray-100"
                                >
                                  <ExternalLink className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                                </Button>
                              )}
                              
                              {activity.category && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleNavigateToCategory(activity.category._id)}
                                  className="h-6 w-6 p-0 hover:bg-gray-100"
                                >
                                  <ExternalLink className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {hasMore && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="hover:bg-gray-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load More Activities
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityPage