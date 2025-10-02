import React, { useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  MoreHorizontal, 
  AlertTriangle,
  CheckCircle2,
  Circle,
  Play,
  Trash2,
  Edit3,
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

const TaskTable = ({ 
  tasks, 
  searchTerm = '', 
  onStatusChange, 
  onEdit, 
  onDelete,
  className 
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const handleStatusChange = (taskId, newStatus) => {
    onStatusChange?.(taskId, newStatus);
  };

  const handleEdit = (task) => {
    onEdit?.(task);
  };

  const handleDeleteClick = (task) => {
    setTaskToDelete(task);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = (taskId) => {
    onDelete?.(taskId);
    setShowDeleteDialog(false);
    setTaskToDelete(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setTaskToDelete(null);
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

  const isOverdue = (dueDate, status) => {
    return dueDate && new Date(dueDate) < new Date() && status !== 'done';
  };

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide w-32">
                Task Name
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide w-24 hidden sm:table-cell">
                Description
              </th>
              <th className="px-1 py-2 text-center text-xs font-medium text-gray-600 uppercase tracking-wide w-16 hidden md:table-cell">
                Assignees
              </th>
              <th className="px-1 py-2 text-center text-xs font-medium text-gray-600 uppercase tracking-wide w-20 hidden lg:table-cell">
                Assigned By
              </th>
              <th className="px-1 py-2 text-center text-xs font-medium text-gray-600 uppercase tracking-wide w-16 hidden lg:table-cell">
                Created
              </th>
              <th className="px-1 py-2 text-center text-xs font-medium text-gray-600 uppercase tracking-wide w-16 hidden md:table-cell">
                Start Date
              </th>
              <th className="px-1 py-2 text-center text-xs font-medium text-gray-600 uppercase tracking-wide w-16">
                Due Date
              </th>
              <th className="px-1 py-2 text-center text-xs font-medium text-gray-600 uppercase tracking-wide w-16 hidden sm:table-cell">
                Priority
              </th>
              <th className="px-1 py-2 text-center text-xs font-medium text-gray-600 uppercase tracking-wide w-16">
                Status
              </th>
              <th className="px-1 py-2 text-center text-xs font-medium text-gray-600 uppercase tracking-wide w-12">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tasks.map((task) => (
              <tr 
                key={task._id} 
                className="hover:bg-gray-50 transition-colors duration-150"
              >
                <td className="px-2 py-2">
                  <div className="truncate">
                    <h3 className={cn(
                      "font-medium text-xs leading-tight truncate",
                      task.status === 'done' ? "line-through text-gray-500" : "text-gray-900"
                    )}>
                      {task.title}
                    </h3>
                  </div>
                </td>

                <td className="px-2 py-2 hidden sm:table-cell">
                  <div className="truncate">
                    <p className={cn(
                      "text-xs text-gray-600 truncate",
                      task.status === 'done' && "line-through"
                    )}>
                      {task.description || '-'}
                    </p>
                  </div>
                </td>

                <td className="px-1 py-2 text-center hidden md:table-cell">
                  {task.assignees && task.assignees.length > 0 ? (
                    <div className="flex items-center justify-center">
                      <div className="flex -space-x-1">
                        {task.assignees.slice(0, 2).map((assignee, index) => (
                          <UserAvatar 
                            key={assignee._id || index} 
                            user={assignee} 
                            size="sm" 
                            className="border border-white w-6 h-6 text-xs"
                          />
                        ))}
                        {task.assignees.length > 2 && (
                          <div className="flex items-center justify-center w-6 h-6 bg-gray-200 rounded-full border border-white text-xs text-gray-600">
                            +{task.assignees.length - 2}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>

                <td className="px-1 py-2 text-center hidden lg:table-cell">
                  <span className="text-gray-600 text-xs truncate block">
                    {task.createdBy?.name?.split(' ')[0] || '-'}
                  </span>
                </td>

                <td className="px-1 py-2 text-center hidden lg:table-cell">
                  <span className="text-gray-600 text-xs">
                    {task.createdAt ? formatDate(task.createdAt, 'short') : '-'}
                  </span>
                </td>

                <td className="px-1 py-2 text-center hidden md:table-cell">
                  <span className="text-gray-600 text-xs">
                    {task.startDate ? formatDate(task.startDate, 'short') : '-'}
                  </span>
                </td>

                <td className="px-1 py-2 text-center">
                  {task.dueDate ? (
                    <span className={cn(
                      "text-xs font-medium",
                      isOverdue(task.dueDate, task.status) ? "text-red-600" : "text-gray-600"
                    )}>
                      {formatDate(task.dueDate, 'short')}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>

                <td className="px-1 py-2 text-center hidden sm:table-cell">
                  {task.priority !== 'medium' ? (
                    <Badge className={cn("text-xs px-1 py-0.5", getPriorityColor(task.priority))}>
                      <div className="flex items-center gap-0.5">
                        {getPriorityIcon(task.priority)}
                        <span className="capitalize text-xs">{task.priority}</span>
                      </div>
                    </Badge>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>

                <td className="px-1 py-2 text-center">
                  <Badge className={cn("text-xs px-1 py-0.5", getStatusColor(task.status))}>
                    <span className="text-xs">
                      {task.status === 'in_progress' ? 'In Progress' : task.status === 'todo' ? 'To Do' : 'Done'}
                    </span>
                  </Badge>
                </td>

                <td className="px-1 py-2 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 hover:bg-gray-100"
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleStatusChange(task._id, 'todo')} className="cursor-pointer">
                        <Circle className="h-4 w-4 mr-2" />
                        Mark as To Do
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(task._id, 'in_progress')} className="cursor-pointer">
                        <Play className="h-4 w-4 mr-2" />
                        Mark In Progress
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(task._id, 'done')} className="cursor-pointer">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark as Done
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleEdit(task)} className="cursor-pointer">
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Task
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDeleteClick(task)}
                        className="text-red-600 cursor-pointer hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Task
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DeleteTaskDialog
        isOpen={showDeleteDialog}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        task={taskToDelete}
      />
    </div>
  );
};

export default TaskTable;
