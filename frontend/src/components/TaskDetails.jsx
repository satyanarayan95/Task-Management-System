import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './ui/tabs';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  User,
  Calendar,
  Clock,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Play,
  Repeat,
  Edit3,
  Trash2,
  Share2,
  Activity,
  Users,
  MessageSquare,
  Plus,
} from 'lucide-react';
import UserAvatar from './UserAvatar';
import { taskAPI } from '../lib/api';
import { cn, formatDate, formatDateTime, getPriorityColor, getStatusColor } from '../lib/utils';

const TaskDetails = ({ 
  isOpen, 
  onClose, 
  taskId,
  onEdit,
  onDelete 
}) => {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchTaskDetails = async () => {
      if (!taskId || !isOpen) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await taskAPI.getTask(taskId);
        if (response.success) {
          setTask(response.data);
        } else {
          throw new Error(response.error.message);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch task details');
      } finally {
        setLoading(false);
      }
    };

    fetchTaskDetails();
  }, [taskId, isOpen]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'todo':
        return <Circle className="h-4 w-4" />;
      case 'in_progress':
        return <Play className="h-4 w-4" />;
      case 'done':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'urgent' || priority === 'high') {
      return <AlertTriangle className="h-3 w-3" />;
    }
    return null;
  };

  const isOverdue = () => {
    if (!task?.dueDate || task.status === 'done') return false;
    return new Date(task.dueDate) < new Date();
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const response = await taskAPI.updateTaskStatus(task._id, newStatus);
      if (response.success) {
        setTask(response.data);
      } else {
        throw new Error(response.error.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to update task status');
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Loading task details...</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-destructive">{error}</p>
              <Button onClick={onClose} className="mt-4">Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-3 text-xl">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const nextStatus = task.status === 'todo' ? 'in_progress' : 
                                     task.status === 'in_progress' ? 'done' : 'todo';
                    handleStatusChange(nextStatus);
                  }}
                  className={cn(
                    "h-8 w-8 p-0 rounded-full",
                    task.status === 'done' && "text-green-600 hover:bg-green-100",
                    task.status === 'in_progress' && "text-blue-600 hover:bg-blue-100",
                    task.status === 'todo' && "text-gray-400 hover:bg-gray-100"
                  )}
                >
                  {getStatusIcon(task.status)}
                </Button>
                <span className={cn(
                  "truncate",
                  task.status === 'done' && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </span>
                {getPriorityIcon(task.priority) && (
                  <span className={cn("flex-shrink-0", getPriorityColor(task.priority))}>
                    {getPriorityIcon(task.priority)}
                  </span>
                )}
                {task.isRecurring && (
                  <Repeat className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </DialogTitle>
              <DialogDescription className="mt-2">
                Created {formatDateTime(task.createdAt)} by {task.creator?.fullName || task.owner?.fullName}
              </DialogDescription>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit?.(task)}
                className="gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete?.(task._id)}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
              <TabsTrigger value="overview" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="assignment" className="gap-2">
                <Users className="h-4 w-4" />
                Assignment
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <Activity className="h-4 w-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="overview" className="space-y-6 m-0">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge 
                        variant="outline" 
                        className={cn("font-medium", getStatusColor(task.status))}
                      >
                        {getStatusIcon(task.status)}
                        {task.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Priority</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge 
                        variant="outline" 
                        className={cn("font-medium", getPriorityColor(task.priority))}
                      >
                        {getPriorityIcon(task.priority)}
                        {task.priority.toUpperCase()}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>

                {task.description && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {task.description}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {task.startDate && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Start Date
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{formatDate(task.startDate)}</p>
                      </CardContent>
                    </Card>
                  )}

                  {task.dueDate && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Due Date
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className={cn(
                          "text-sm",
                          isOverdue() && "text-red-600 font-medium"
                        )}>
                          {formatDate(task.dueDate)}
                          {isOverdue() && " (Overdue)"}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {task.category && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          Category
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="secondary" className="text-xs">
                          {task.category.name}
                        </Badge>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="assignment" className="space-y-6 m-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Current Assignee
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {task.assignees && task.assignees.length > 0 ? (
                      <div className="space-y-2">
                        {task.assignees.map((assignee, index) => (
                          <div key={assignee._id || index} className="flex items-center gap-3">
                            <UserAvatar user={assignee} size="md" />
                            <div>
                              <p className="font-medium">{assignee.fullName}</p>
                              <p className="text-sm text-muted-foreground">{assignee.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No assignees set
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Task Owner
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {task.owner && (
                      <div className="flex items-center gap-3">
                        <UserAvatar user={task.owner} size="md" />
                        <div>
                          <p className="font-medium">{task.owner.fullName}</p>
                          <p className="text-sm text-muted-foreground">{task.owner.email}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {task.sharedWith && task.sharedWith.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Share2 className="h-4 w-4" />
                        Shared With
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {task.sharedWith.map((share) => (
                          <div key={share.user._id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <UserAvatar user={share.user} size="sm" />
                              <div>
                                <p className="text-sm font-medium">{share.user.fullName}</p>
                                <p className="text-xs text-muted-foreground">{share.user.email}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {share.permission}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="activity" className="space-y-4 m-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Plus className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">
                              {task.creator?.fullName || task.owner?.fullName}
                            </span>
                            {' '}created this task
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(task.createdAt)}
                          </p>
                        </div>
                      </div>

                      {task.updatedAt && task.updatedAt !== task.createdAt && (
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <Edit3 className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">Task was updated</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(task.updatedAt)}
                            </p>
                          </div>
                        </div>
                      )}

                      {task.assignees && task.assignees.length > 0 && (
                        <div className="space-y-2">
                          {task.assignees.map((assignee, index) => (
                            <div key={assignee._id || index} className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-purple-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm">
                                  Task assigned to{' '}
                                  <span className="font-medium">{assignee.fullName}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDateTime(task.updatedAt)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">
                          More detailed activity history will be available soon
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetails;