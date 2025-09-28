import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'
import { Progress } from '../components/ui/progress'
import { Alert, AlertDescription } from '../components/ui/alert'
import TaskForm from '../components/TaskForm'
import UserAvatar from '../components/UserAvatar'
import { useTaskStore } from '../stores'
import { taskAPI } from '../lib/api'
import { cn, formatDate } from '../lib/utils'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  User,
  Tag,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  Play,
  MoreHorizontal,
  Activity,
  MessageSquare,
  Bell,
  Repeat,
  FileText,
  Target,
  Zap
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'

const TaskDetailsPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tasks, updateTask, deleteTask } = useTaskStore()
  
  const [task, setTask] = useState(null)
  const [activityLog, setActivityLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const loadTaskDetails = async () => {
      try {
        setLoading(true)
        setError(null)

        const existingTask = tasks.find(t => t._id === id)
        if (existingTask) {
          setTask(existingTask)
        }

        const [taskResponse, activityResponse] = await Promise.all([
          taskAPI.getTask(id),
          taskAPI.getTaskActivity(id)
        ])

        if (taskResponse.success) {
          setTask(taskResponse.data)
        } else {
          setError(taskResponse.error.message)
        }

        if (activityResponse.success) {
          setActivityLog(activityResponse.data)
        }
      } catch (err) {
        console.error('Error loading task details:', err)
        setError('Failed to load task details')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadTaskDetails()
    }
  }, [id, tasks])

  const handleStatusChange = async (newStatus) => {
    try {
      const response = await taskAPI.updateTaskStatus(id, newStatus)
      if (response.success) {
        setTask(response.data)
        updateTask(response.data)
        const activityResponse = await taskAPI.getTaskActivity(id)
        if (activityResponse.success) {
          setActivityLog(activityResponse.data)
        }
      } else {
        setError(response.error.message)
      }
    } catch (err) {
      console.error('Error updating task status:', err)
      setError('Failed to update task status')
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return
    }

    try {
      setIsDeleting(true)
      const response = await taskAPI.deleteTask(id)
      if (response.success) {
        deleteTask(id)
        navigate('/tasks')
      } else {
        setError(response.error.message)
      }
    } catch (err) {
      console.error('Error deleting task:', err)
      setError('Failed to delete task')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTaskFormClose = (updatedTask) => {
    setIsEditing(false)
    if (updatedTask) {
      setTask(updatedTask)
      updateTask(updatedTask)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'in_progress':
        return <Play className="h-5 w-5 text-blue-600" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const isOverdue = task?.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/tasks')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tasks
        </Button>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="text-center py-16">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Task not found</h3>
        <p className="text-gray-500 mb-4">The task you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
        <Button onClick={() => navigate('/tasks')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tasks
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/tasks')}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{task.title}</h1>
            <p className="text-sm text-gray-600 mt-1">
              Created {formatDate(task.createdAt)} • Last updated {formatDate(task.updatedAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            className="hover:bg-gray-50"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hover:bg-gray-50">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Task
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-600 focus:text-red-600"
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Badge className={cn("px-3 py-1", getStatusColor(task.status))}>
          {getStatusIcon(task.status)}
          <span className="ml-2 capitalize">{task.status.replace('_', ' ')}</span>
        </Badge>
        
        {task.priority && task.priority !== 'medium' && (
          <Badge className={cn("px-3 py-1", getPriorityColor(task.priority))}>
            <Zap className="h-3 w-3 mr-1" />
            <span className="capitalize">{task.priority}</span>
          </Badge>
        )}

        {isOverdue && (
          <Badge variant="destructive" className="px-3 py-1">
            <AlertCircle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        )}

        {task.isRecurring && (
          <Badge variant="outline" className="px-3 py-1">
            <Repeat className="h-3 w-3 mr-1" />
            Recurring
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-600" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
                </div>
              ) : (
                <p className="text-gray-500 italic">No description provided</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-gray-600" />
                Activity Log
              </CardTitle>
              <CardDescription>
                Recent changes and updates to this task
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityLog.length > 0 ? (
                <div className="space-y-4">
                  {activityLog.map((activity, index) => (
                    <div key={activity._id || index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <Activity className="h-4 w-4 text-gray-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(activity.timestamp)}
                          </p>
                        </div>
                        {activity.oldValue && activity.newValue && (
                          <p className="text-sm text-gray-600 mt-1">
                            Changed from &quot;{activity.oldValue}&quot; to &quot;{activity.newValue}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-500">No activity recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {task.status !== 'done' && (
                <Button
                  onClick={() => handleStatusChange('done')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                  Mark as Done
                </Button>
              )}
              
              {task.status === 'todo' && (
                <Button
                  onClick={() => handleStatusChange('in_progress')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Play className="h-4 w-4 mr-2 text-blue-600" />
                  Start Task
                </Button>
              )}
              
              {task.status === 'in_progress' && (
                <Button
                  onClick={() => handleStatusChange('todo')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Circle className="h-4 w-4 mr-2 text-gray-600" />
                  Move to To Do
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <User className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Assignee</p>
                  <div className="flex items-center space-x-2 mt-1">
                    {task.assignees && task.assignees.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1">
                          {task.assignees.slice(0, 3).map((assignee, index) => (
                            <UserAvatar key={assignee._id || index} user={assignee} size="sm" />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          {task.assignees.length === 1 ? task.assignees[0].fullName : `${task.assignees.length} assignees`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-600">Unassigned</span>
                    )}
                  </div>
                </div>
              </div>

              {task.category && (
                <div className="flex items-center space-x-3">
                  <Tag className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Category</p>
                    <Badge variant="outline" className="mt-1">
                      {task.category.name}
                    </Badge>
                  </div>
                </div>
              )}

              {task.dueDate && (
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Due Date</p>
                    <p className={cn(
                      "text-sm mt-1",
                      isOverdue ? "text-red-600 font-medium" : "text-gray-600"
                    )}>
                      {formatDate(task.dueDate)}
                    </p>
                  </div>
                </div>
              )}

              {task.isRecurring && task.recurringPattern && (
                <div className="flex items-center space-x-3">
                  <Repeat className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Recurrence</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {task.recurringPattern}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <TaskForm
        isOpen={isEditing}
        onClose={handleTaskFormClose}
        task={task}
        mode="edit"
      />
    </div>
  )
}

export default TaskDetailsPage
