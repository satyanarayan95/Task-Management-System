import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Tag,
  AlertTriangle,
  Plus,
  Repeat,
  CheckCircle2,
  Circle,
  Play,
  Clock,
  Calendar,
  Info,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { DateTimePicker } from './ui/date-picker';
import MultiSelectAutocomplete from './MultiSelectAutocomplete';
import DurationInput from './DurationInput';
import RecurrencePattern from './RecurrencePattern';
import { categoryAPI, taskAPI } from '../lib/api';
import { toast, apiToast } from '../lib/toast';
import { calculateDuration } from '../lib/durationUtils';

const TaskForm = ({
  isOpen,
  onClose,
  task = null,
  mode = 'create' // 'create' or 'edit'
}) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState(null);
  const [duration, setDuration] = useState(null);
  const [timingMode, setTimingMode] = useState('duration'); // 'duration' or 'duedate'
  const [editScope, setEditScope] = useState('this_instance'); // 'this_instance', 'this_and_future', 'all_instances'
  
  const resetForm = () => {
    form.reset({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      category: 'none',
      startDate: undefined,
      dueDate: undefined
    });
    setSelectedAssignees([]);
    setIsRecurring(false);
    setRecurringPattern(null);
    setDuration(null);
    setTimingMode('duration');
    setEditScope('this_instance');
  };
  
  const dateShortcuts = [
    { label: 'Today', value: new Date() },
    { label: 'Tomorrow', value: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    { label: 'Next week', value: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  ];

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      category: 'none',
      startDate: undefined,
      dueDate: undefined
    }
  });

  useEffect(() => {
    if (task && mode === 'edit') {
      form.reset({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        status: task.status || 'todo',
        category: task.category?._id || 'none',
        startDate: task.startDate ? new Date(task.startDate) : null,
        dueDate: task.dueDate ? new Date(task.dueDate) : null
      });
      
      if (task.assignees && task.assignees.length > 0) {
        setSelectedAssignees(task.assignees);
      }
      
      setIsRecurring(task.isRecurring || false);
      
      if (task.duration) {
        setDuration(task.duration);
        setTimingMode('duration');
      } else if (task.dueDate && task.startDate) {
        const calculatedDuration = calculateDuration(task.startDate, task.dueDate);
        if (calculatedDuration) {
          setDuration(calculatedDuration);
          setTimingMode('duration');
        } else {
          setTimingMode('duedate');
        }
      } else {
        setTimingMode('duration');
      }
      
      // Handle recurring pattern
      if (task.recurringPattern) {
        if (typeof task.recurringPattern === 'string') {
          const rrule = task.recurringPattern;
          const pattern = {
            frequency: 'daily',
            interval: 1,
            endDate: null,
            endOccurrences: null,
            timezone: 'UTC'
          };
          
          if (rrule.includes('FREQ=DAILY')) pattern.frequency = 'daily';
          else if (rrule.includes('FREQ=WEEKLY')) pattern.frequency = 'weekly';
          else if (rrule.includes('FREQ=MONTHLY')) pattern.frequency = 'monthly';
          else if (rrule.includes('FREQ=YEARLY')) pattern.frequency = 'yearly';
          
          const intervalMatch = rrule.match(/INTERVAL=(\d+)/);
          if (intervalMatch) pattern.interval = parseInt(intervalMatch[1]);
          
          if (rrule.includes('COUNT=')) {
            const countMatch = rrule.match(/COUNT=(\d+)/);
            if (countMatch) pattern.endOccurrences = parseInt(countMatch[1]);
          } else if (rrule.includes('UNTIL=')) {
            const untilMatch = rrule.match(/UNTIL=([^;]+)/);
            if (untilMatch) pattern.endDate = new Date(untilMatch[1]).toISOString();
          }
          
          setRecurringPattern(pattern);
        } else {
          setRecurringPattern(task.recurringPattern);
        }
      } else {
        setRecurringPattern(null);
      }
      
      // Handle edit scope for existing recurring tasks
      if (mode === 'edit' && task && task.isRecurring) {
        // If it's a parent task (no parentTask), default to 'this_and_future' for parent updates
        // If it's an instance (has parentTask), default to 'this_instance'
        const defaultScope = task.parentTask ? 'this_instance' : 'this_and_future';
        setEditScope(task.editScope || defaultScope);
      }
    } else {
      form.reset({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        category: 'none',
        startDate: undefined,
        dueDate: undefined
      });
      setSelectedAssignees([]);
      setIsRecurring(false);
      setRecurringPattern(null);
      setDuration(null);
      setTimingMode('duration');
      setEditScope('this_instance');
    }
  }, [task, mode, form]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesResponse = await categoryAPI.getCategories();
        if (categoriesResponse.success) {
          setCategories(categoriesResponse.data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const handleSubmit = async (data) => {
    try {
      setLoading(true);
      
      const assigneeIds = selectedAssignees.map(user => {
        if (typeof user === 'string') return user;
        return user._id || user.id;
      });
      
      let taskData = {
        ...data,
        category: data.category === 'none' ? '' : data.category,
        assignees: assigneeIds,
        isRecurring
      };
      
      // Handle timing based on mode
      if (timingMode === 'duration' && duration) {
        taskData.duration = duration;
        delete taskData.dueDate;
      } else if (timingMode === 'duedate' && data.dueDate) {
        taskData.dueDate = typeof data.dueDate === 'string' ? data.dueDate : data.dueDate.toISOString();
        delete taskData.duration;
      }
      
      if (data.startDate && data.startDate !== null && data.startDate !== undefined) {
        taskData.startDate = typeof data.startDate === 'string' ? data.startDate : data.startDate.toISOString();
      } else {
        delete taskData.startDate;
      }
      
      if (isRecurring) {
        // Ensure a valid recurringPattern is included for recurring tasks
        const safePattern = recurringPattern || {
          frequency: 'daily',
          interval: 1,
          timezone: 'UTC',
          endDate: null,
          endOccurrences: null
        };
        // sanitize timezone
        if (!safePattern.timezone || typeof safePattern.timezone !== 'string' || safePattern.timezone.trim() === '') {
          safePattern.timezone = 'UTC';
        }
        // remove conflicting end conditions
        if (safePattern.endDate && safePattern.endOccurrences) {
          safePattern.endOccurrences = null;
        }

        if (!duration && timingMode !== 'duration') {
          toast.error('Duration is required for recurring tasks');
          return;
        }

        taskData.recurringPattern = safePattern;
      }
      
      if (mode === 'edit' && task && (task.isRecurring || isRecurring)) {
        taskData.editScope = editScope; // Use the selected scope
      }
      
      

      let response;
      if (mode === 'edit' && task) {
        response = await taskAPI.updateTask(task._id, taskData);
      } else {
        response = await taskAPI.createTask(taskData);
      }

      if (response.success) {
        toast.success(mode === 'edit' ? 'Task updated successfully' : 'Task created successfully');
        
        if (mode === 'create') {
          resetForm();
        }
        
        onClose(response.data);
      } else {
        
        if (response.error.details && response.error.details.length > 0) {
          response.error.details.forEach(error => {
            const fieldName = getFieldDisplayName(error.field);
            toast.error(`${fieldName}: ${error.message}`);
          });
        } else if (response.error.errors && response.error.errors.length > 0) {
          apiToast.validationError(response.error.errors);
        } else {
          toast.error(response.error.message || response.error.error || 'Failed to save task');
        }
      }
    } catch (error) {
      toast.error(`Unexpected error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };





  const getFieldDisplayName = (fieldName) => {
    const fieldMap = {
      'title': 'Task Name',
      'description': 'Description',
      'priority': 'Priority',
      'status': 'Status',
      'category': 'Category',
      'assignees': 'Assignees',
      'startDate': 'Start Date',
      'dueDate': 'Due Date',
      'isRecurring': 'Repeat Task',
      'recurringPattern': 'Recurrence Settings'
    };
    return fieldMap[fieldName] || fieldName;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && mode === 'create') {
        resetForm();
      }
      onClose();
    }}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto w-[98vw] sm:w-full p-4 sm:p-6" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'edit' ? (
              <>
                <Tag className="h-5 w-5 text-blue-600" />
                Edit Task
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 text-green-600" />
                Create Task
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? 'Update your task details' : 'Add a new task to your list'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 sm:space-y-6">
            <div className="space-y-4 sm:space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  rules={{
                    required: 'Task title is required',
                    maxLength: {
                      value: 200,
                      message: 'Title must be less than 200 characters'
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="What needs to be done?"
                          {...field}
                          className="text-lg"
                          maxLength={200}
                        />
                      </FormControl>
                      <div className="flex justify-between items-center">
                        <FormMessage />
                        <span className={`text-xs ${field.value?.length > 180 ? 'text-red-500' : 'text-gray-500'}`}>
                          {field.value?.length || 0}/200
                        </span>
                      </div>
                    </FormItem>
                  )}
                />
  
                <FormField
                  control={form.control}
                  name="description"
                  rules={{
                    maxLength: {
                      value: 1000,
                      message: 'Description must be less than 1000 characters'
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add details, notes, or context..."
                          className="min-h-20 resize-none"
                          maxLength={1000}
                          {...field}
                        />
                      </FormControl>
                      <div className="flex justify-between items-center">
                        <FormMessage />
                        <span className={`text-xs ${field.value?.length > 900 ? 'text-red-500' : 'text-gray-500'}`}>
                          {field.value?.length || 0}/1000
                        </span>
                      </div>
                    </FormItem>
                  )}
                />
  
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue>
                                <div className="flex items-center gap-2">
                                  {field.value === 'urgent' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                                  {field.value === 'high' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                                  {field.value === 'medium' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                  {field.value === 'low' && <div className="w-2 h-2 rounded-full bg-gray-400" />}
                                  <span className="capitalize">{field.value}</span>
                                </div>
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-gray-400" />
                                Low
                              </div>
                            </SelectItem>
                            <SelectItem value="medium">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                Medium
                              </div>
                            </SelectItem>
                            <SelectItem value="high">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                                High
                              </div>
                            </SelectItem>
                            <SelectItem value="urgent">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                Urgent
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue>
                                <div className="flex items-center gap-2">
                                  {field.value === 'todo' && <Circle className="h-4 w-4 text-gray-400" />}
                                  {field.value === 'in_progress' && <Play className="h-4 w-4 text-blue-500" />}
                                  {field.value === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                  <span className="capitalize">{field.value.replace('_', ' ')}</span>
                                </div>
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="todo">
                              <div className="flex items-center gap-2">
                                <Circle className="h-4 w-4 text-gray-400" />
                                To Do
                              </div>
                            </SelectItem>
                            <SelectItem value="in_progress">
                              <div className="flex items-center gap-2">
                                <Play className="h-4 w-4 text-blue-500" />
                                In Progress
                              </div>
                            </SelectItem>
                            <SelectItem value="done">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                Done
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
  
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose category">
                                {field.value && field.value !== 'none' && categories.find(cat => cat._id === field.value) && (
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <span>{categories.find(cat => cat._id === field.value)?.name}</span>
                                  </div>
                                )}
                                {field.value === 'none' && (
                                  <span className="text-muted-foreground">No Category</span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">
                              <span className="text-muted-foreground">No Category</span>
                            </SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category._id} value={category._id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                                  <span>{category.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
  
                <FormItem>
                  <FormLabel>Assign to</FormLabel>
                  <MultiSelectAutocomplete
                    value={selectedAssignees}
                    onChange={setSelectedAssignees}
                    placeholder="Search and assign users..."
                    autoSelectCurrentUser={true}
                    className="w-full"
                  />
                </FormItem>
              {/* Timing Section */}
              <div className="space-y-3 sm:space-y-4 border-t pt-4 sm:pt-6">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <DateTimePicker
                        label="Start Date & Time"
                        placeholder="Select start date and time"
                        value={field.value}
                        onChange={field.onChange}
                        includeTime={true}
                      />
                    </FormItem>
                  )}
                />
  
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Label className="text-sm font-medium">Due Date</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={timingMode === 'duration' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          if (!isRecurring) {
                            setTimingMode('duration');
                          }
                        }}
                        className="flex-1 sm:flex-none"
                        disabled={isRecurring}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Duration
                      </Button>
                      <Button
                        type="button"
                        variant={timingMode === 'duedate' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          if (!isRecurring) {
                            setTimingMode('duedate');
                          }
                        }}
                        className="flex-1 sm:flex-none"
                        disabled={isRecurring}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Specific Date
                      </Button>
                    </div>
                  </div>
  
                  {timingMode === 'duration' ? (
                    <DurationInput
                      value={duration}
                      onChange={setDuration}
                      required={isRecurring}
                      label="Task Duration"
                      showPreview={true}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <DateTimePicker
                            label="Due Date & Time"
                            placeholder="Select due date and time"
                            value={field.value}
                            onChange={field.onChange}
                            includeTime={true}
                          />
                          <div className="flex gap-1 flex-wrap mt-2">
                            {dateShortcuts.map((shortcut, index) => (
                              <Button
                                key={index}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs flex-1 sm:flex-none"
                                onClick={() => field.onChange(shortcut.value)}
                              >
                                {shortcut.label}
                              </Button>
                            ))}
                          </div>
                        </FormItem>
                      )}
                    />
                  )}
                </div>
  
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Repeat className="h-4 w-4 text-blue-600" />
                      <Label className="text-sm font-medium">Repeat Task</Label>
                    </div>
                    <Switch
                      id="isRecurring"
                      checked={isRecurring}
                      onCheckedChange={(checked) => {
                        setIsRecurring(checked);
                        if (checked) {
                          // When enabling recurrence, force duration mode and ensure a default recurring pattern exists
                          setTimingMode('duration');
                          setRecurringPattern(prev => prev || {
                            frequency: 'daily',
                            interval: 1,
                            daysOfWeek: [],
                            dayOfMonth: 1,
                            endDate: null,
                            endOccurrences: null,
                            timezone: 'UTC'
                          });
                        }
                        if (!checked) {
                          setRecurringPattern(null);
                        }
                      }}
                    />
                  </div>
                  
                  {/* Edit Scope Selection - Only show for instances (not parent tasks) */}
                  {mode === 'edit' && task && task.isRecurring && task.parentTask && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-600">Edit Scope</Label>
                      <Select value={editScope} onValueChange={setEditScope}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="this_instance">This instance only</SelectItem>
                          <SelectItem value="this_and_future">This and future instances</SelectItem>
                          <SelectItem value="all_instances">All instances</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        {editScope === 'this_instance' && 'Changes will only apply to this specific task instance'}
                        {editScope === 'this_and_future' && 'Changes will apply to this instance and all future instances'}
                        {editScope === 'all_instances' && 'Changes will apply to all instances including past ones'}
                      </p>
                    </div>
                  )}
                  
                  {/* Info message for parent tasks */}
                  {mode === 'edit' && task && task.isRecurring && !task.parentTask && (
                    <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-md">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-800">
                        This is a parent task. Changes will automatically apply to future instances.
                      </p>
                    </div>
                  )}
                </div>
              {/* Recurrence Section */}
              {isRecurring && (
                <div className="space-y-3 border-t pt-4">
                  <RecurrencePattern
                    value={recurringPattern}
                    onChange={setRecurringPattern}
                    startDate={form.watch('startDate')}
                    duration={duration}
                  />
                </div>
              )}
            </div>
  
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (mode === 'create') {
                    resetForm();
                  }
                  onClose();
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{mode === 'edit' ? 'Updating...' : 'Creating...'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {mode === 'edit' ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Update Task
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Create Task
                      </>
                    )}
                  </div>
                )}
              </Button>
            </DialogFooter>
          </div>
          </form>
        </Form>
        </DialogContent>
      </Dialog>
    );
};

export default TaskForm;