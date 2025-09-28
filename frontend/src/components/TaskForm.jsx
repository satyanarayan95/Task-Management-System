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
import { taskAPI } from '../lib/api';
import { toast, apiToast } from '../lib/toast';

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
      if (task.recurringPattern) {
        if (typeof task.recurringPattern === 'string') {
          const rrule = task.recurringPattern;
          const pattern = {
            frequency: 'daily',
            interval: 1,
            endType: 'never'
          };
          
          if (rrule.includes('FREQ=DAILY')) pattern.frequency = 'daily';
          else if (rrule.includes('FREQ=WEEKLY')) pattern.frequency = 'weekly';
          else if (rrule.includes('FREQ=MONTHLY')) pattern.frequency = 'monthly';
          else if (rrule.includes('FREQ=YEARLY')) pattern.frequency = 'yearly';
          
          const intervalMatch = rrule.match(/INTERVAL=(\d+)/);
          if (intervalMatch) pattern.interval = parseInt(intervalMatch[1]);
          
          if (rrule.includes('COUNT=')) {
            pattern.endType = 'count';
            const countMatch = rrule.match(/COUNT=(\d+)/);
            if (countMatch) pattern.endCount = parseInt(countMatch[1]);
          } else if (rrule.includes('UNTIL=')) {
            pattern.endType = 'date';
            const untilMatch = rrule.match(/UNTIL=([^;]+)/);
            if (untilMatch) pattern.endDate = new Date(untilMatch[1]);
          }
          
          setRecurringPattern(pattern);
        } else {
          setRecurringPattern(task.recurringPattern);
        }
      } else {
        setRecurringPattern(null);
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
    }
  }, [task, mode, form]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesResponse = await taskAPI.getCategories();
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
      
      let rrulePattern = null;
      if (isRecurring && recurringPattern) {
        const { frequency, interval, endType, endCount, endDate } = recurringPattern;
        let rrule = `FREQ=${frequency.toUpperCase()}`;
        
        if (interval && interval > 1) {
          rrule += `;INTERVAL=${interval}`;
        }
        
        if (endType === 'count' && endCount) {
          rrule += `;COUNT=${endCount}`;
        } else if (endType === 'date' && endDate) {
          rrule += `;UNTIL=${endDate.toISOString().split('T')[0].replace(/-/g, '')}`;
        }
        
        rrulePattern = rrule;
      }

      const taskData = {
        ...data,
        category: data.category === 'none' ? '' : data.category,
        assignees: assigneeIds,
        isRecurring
      };
      
      if (isRecurring && rrulePattern) {
        taskData.recurringPattern = rrulePattern;
      }
      
      if (data.startDate && data.startDate !== null && data.startDate !== undefined) {
        taskData.startDate = typeof data.startDate === 'string' ? data.startDate : data.startDate.toISOString();
      } else {
        delete taskData.startDate;
      }
      
      if (data.dueDate && data.dueDate !== null && data.dueDate !== undefined) {
        taskData.dueDate = typeof data.dueDate === 'string' ? data.dueDate : data.dueDate.toISOString();
      } else {
        delete taskData.dueDate;
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
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto w-[98vw] sm:w-full p-4 sm:p-8" showCloseButton={false}>
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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 sm:space-y-8 px-2">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
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


            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
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
            </div>

            <div className="space-y-4 border-t pt-6">
              <div className="space-y-4">
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
                      if (!checked) {
                        setRecurringPattern(null);
                      }
                    }}
                  />
                </div>

                {isRecurring && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-gray-600">Frequency</Label>
                        <Select 
                          value={recurringPattern?.frequency || 'daily'} 
                          onValueChange={(value) => {
                            setRecurringPattern(prev => ({
                              ...prev,
                              frequency: value,
                              interval: 1
                            }));
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-gray-600">Every</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            max="99"
                            value={recurringPattern?.interval || 1}
                            onChange={(e) => {
                              const interval = parseInt(e.target.value) || 1;
                              setRecurringPattern(prev => ({
                                ...prev,
                                interval
                              }));
                            }}
                            className="h-9 w-16"
                          />
                          <span className="text-xs text-gray-500">
                            {recurringPattern?.frequency === 'daily' && (recurringPattern?.interval === 1 ? 'day' : 'days')}
                            {recurringPattern?.frequency === 'weekly' && (recurringPattern?.interval === 1 ? 'week' : 'weeks')}
                            {recurringPattern?.frequency === 'monthly' && (recurringPattern?.interval === 1 ? 'month' : 'months')}
                            {recurringPattern?.frequency === 'yearly' && (recurringPattern?.interval === 1 ? 'year' : 'years')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-600">Ends</Label>
                      <Select 
                        value={recurringPattern?.endType || 'never'} 
                        onValueChange={(value) => {
                          setRecurringPattern(prev => ({
                            ...prev,
                            endType: value
                          }));
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="never">Never</SelectItem>
                          <SelectItem value="count">After number of occurrences</SelectItem>
                          <SelectItem value="date">On specific date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {recurringPattern?.endType === 'count' && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-gray-600">Number of occurrences</Label>
                        <Input
                          type="number"
                          min="1"
                          max="999"
                          value={recurringPattern?.endCount || 10}
                          onChange={(e) => {
                            const endCount = parseInt(e.target.value) || 10;
                            setRecurringPattern(prev => ({
                              ...prev,
                              endCount
                            }));
                          }}
                          className="h-9 w-24"
                        />
                      </div>
                    )}

                    {recurringPattern?.endType === 'date' && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-gray-600">End date</Label>
                        <Input
                          type="date"
                          value={recurringPattern?.endDate ? recurringPattern.endDate.toISOString().split('T')[0] : ''}
                          onChange={(e) => {
                            const endDate = e.target.value ? new Date(e.target.value) : null;
                            setRecurringPattern(prev => ({
                              ...prev,
                              endDate
                            }));
                          }}
                          min={form.watch('startDate') ? form.watch('startDate').toISOString().split('T')[0] : undefined}
                          className="h-9"
                        />
                      </div>
                    )}

                    <div className="p-3 bg-white rounded border">
                      <Label className="text-xs font-medium text-gray-600">Preview</Label>
                      <p className="text-sm mt-1 text-gray-700">
                        {recurringPattern?.frequency && recurringPattern?.interval ? 
                          `Repeats every ${recurringPattern.interval} ${recurringPattern.frequency === 'daily' ? (recurringPattern.interval === 1 ? 'day' : 'days') : recurringPattern.frequency === 'weekly' ? (recurringPattern.interval === 1 ? 'week' : 'weeks') : recurringPattern.frequency === 'monthly' ? (recurringPattern.interval === 1 ? 'month' : 'months') : (recurringPattern.interval === 1 ? 'year' : 'years')}${recurringPattern?.endType === 'count' && recurringPattern?.endCount ? `, ${recurringPattern.endCount} times` : recurringPattern?.endType === 'date' && recurringPattern?.endDate ? `, until ${recurringPattern.endDate.toLocaleDateString()}` : ''}` :
                          'Select frequency to see preview'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskForm;