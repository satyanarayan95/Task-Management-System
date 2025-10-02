import { useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  MoreHorizontal, 
  AlertTriangle,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  Play,
  Clock3
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import UserAvatar from './UserAvatar';
import DeleteTaskDialog from './DeleteTaskDialog';
import { cn, formatDate } from '../lib/utils';

const TaskGridCard = ({ 
  task, 
  onEdit, 
  onDelete,
  onStatusChange,
  className 
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);


  const handleEdit = () => {
    onEdit?.(task);
  };

  const handleStatusChange = (newStatus) => {
    onStatusChange?.(task._id, newStatus);
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = (taskId) => {
    onDelete?.(taskId);
    setShowDeleteDialog(false);
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Play className="h-4 w-4 text-blue-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <div 
      className={cn(
        "group hover:shadow-md transition-all duration-200 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-blue-50/50 relative",
        className
      )}
    >
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              handleStatusChange('todo');
            }} className="cursor-pointer text-xs">
              <Circle className="h-3 w-3 mr-2" />
              Mark as To Do
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              handleStatusChange('in_progress');
            }} className="cursor-pointer text-xs">
              <Play className="h-3 w-3 mr-2" />
              Mark In Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              handleStatusChange('done');
            }} className="cursor-pointer text-xs">
              <CheckCircle2 className="h-3 w-3 mr-2" />
              Mark as Done
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              handleEdit();
            }} className="cursor-pointer text-xs">
              <Edit3 className="h-3 w-3 mr-2" />
              Edit Task
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick();
              }}
              className="text-red-600 cursor-pointer hover:bg-red-50 text-xs"
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="p-4">
        <h3 className={cn(
          "font-medium text-sm leading-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-2",
          task.status === 'done' ? "line-through text-gray-500" : "text-gray-900"
        )}>
          {task.title}
        </h3>

        {task.description && (
          <p className={cn(
            "text-xs text-gray-600 line-clamp-2 mb-2",
            task.status === 'done' && "line-through"
          )}>
            {task.description}
          </p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Clock3 className="h-3 w-3 text-gray-400" />
                <span className={cn(
                  "text-xs font-medium",
                  isOverdue ? "text-red-600" : "text-gray-600"
                )}>
                  {formatDate(task.dueDate)}
                </span>
              </div>
            )}
            
            {task.priority !== 'medium' && (
              <Badge className={cn("text-xs px-1.5 py-0.5", getPriorityColor(task.priority))}>
                <div className="flex items-center gap-1">
                  {getPriorityIcon(task.priority)}
                  <span className="capitalize text-xs">{task.priority}</span>
                </div>
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            {task.assignees && task.assignees.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="flex -space-x-1">
                  {task.assignees.slice(0, 2).map((assignee, index) => (
                    <UserAvatar 
                      key={assignee._id || index} 
                      user={assignee} 
                      size="xs" 
                      className="border border-white"
                    />
                  ))}
                  {task.assignees.length > 2 && (
                    <div className="flex items-center justify-center w-4 h-4 bg-gray-200 rounded-full border border-white text-xs text-gray-600">
                      +{task.assignees.length - 2}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500 ml-1">
                  {task.assignees.length}
                </span>
              </div>
            )}
            
            <Badge className={cn("text-xs px-1.5 py-0.5", getStatusColor(task.status))}>
              {task.status === 'in_progress' ? 'In Progress' : task.status === 'todo' ? 'To Do' : 'Done'}
            </Badge>
          </div>

          {task.category && (
            <div className="flex justify-start">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 font-medium text-xs px-1.5 py-0.5">
                {task.category.name}
              </Badge>
            </div>
          )}
        </div>
      </div>

      <DeleteTaskDialog
        isOpen={showDeleteDialog}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        task={task}
      />
    </div>
  );
};

export default TaskGridCard;
