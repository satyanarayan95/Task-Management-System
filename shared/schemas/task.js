import { z } from 'zod';

// Task status enum
const taskStatusSchema = z.enum(['todo', 'in_progress', 'done'], {
  errorMap: () => ({ message: 'Please select a valid task status' })
});

// Task priority enum
const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'], {
  errorMap: () => ({ message: 'Please select a valid priority level' })
});

// Task permission enum for sharing
const taskPermissionSchema = z.enum(['view', 'edit']);

//  Duration schema with validation
const durationSchema = z.object({
  years: z.number().min(0, 'Years cannot be negative').max(99, 'Years cannot exceed 99').default(0),
  months: z.number().min(0, 'Months cannot be negative').max(11, 'Months cannot exceed 11').default(0),
  days: z.number().min(0, 'Days cannot be negative').max(30, 'Days cannot exceed 30').default(0),
  hours: z.number().min(0, 'Hours cannot be negative').max(23, 'Hours cannot exceed 23').default(0),
  minutes: z.number().min(0, 'Minutes cannot be negative').max(59, 'Minutes cannot exceed 59').default(0)
}).refine((data) => {
  // At least one unit must be positive for recurring tasks
  const total = data.years + data.months + data.days + data.hours + data.minutes;
  return total > 0;
}, {
  message: "Duration must have at least one positive value",
  path: ["duration"]
});

//  Recurring pattern validation
const recurringPatternSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly'], {
    errorMap: () => ({ message: 'Please select a valid frequency' })
  }),
  interval: z.number().min(1, 'Interval must be at least 1').max(99, 'Interval cannot exceed 99').default(1),
  daysOfWeek: z.array(z.number().min(0, 'Day must be between 0 and 6').max(6, 'Day must be between 0 and 6')).optional(),
  dayOfMonth: z.number().min(1, 'Day must be between 1 and 31').max(31, 'Day must be between 1 and 31').optional(),
  endDate: z.string().datetime('Please enter a valid end date').nullable().optional(),
  endOccurrences: z.number().min(1, 'Must have at least 1 occurrence').max(999, 'Cannot exceed 999 occurrences').nullable().optional(),
  timezone: z.string().default('UTC').refine((tz) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, {
    message: 'Invalid timezone'
  })
}).refine((data) => {
  // Validation based on frequency
  if (data.frequency === 'weekly' && (!data.daysOfWeek || data.daysOfWeek.length === 0)) {
    return false;
  }
  if (data.frequency === 'monthly' && !data.dayOfMonth) {
    return false;
  }
  
  // Can't have both end conditions
  if (data.endDate && data.endOccurrences) {
    return false;
  }
  
  return true;
}, {
  message: "Invalid recurrence pattern configuration",
  path: ["recurringPattern"]
});

//  Task creation schema
const taskCreateSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .trim()
    .optional(),
  status: taskStatusSchema.default('todo'),
  priority: taskPrioritySchema.default('medium'),
  category: z.string()
    .optional(), // ObjectId as string
  assignees: z.array(z.string())
    .optional(), // Array of ObjectId strings - users to assign task to
  startDate: z.string()
    .datetime('Please enter a valid start date and time')
    .optional(),
  
  //  Either duration or dueDate (for backward compatibility)
  duration: durationSchema.optional(),
  dueDate: z.string()
    .datetime('Please enter a valid due date and time')
    .optional(),
  
  isRecurring: z.boolean().default(false),
  recurringPattern: recurringPatternSchema.optional()
}).refine((data) => {
  // For recurring tasks, duration is required
  if (data.isRecurring && !data.duration) {
    return false;
  }
  
  // For non-recurring tasks, either duration or dueDate
  if (!data.isRecurring && !data.duration && !data.dueDate) {
    return false;
  }
  
  // Can't have both duration and dueDate
  if (data.duration && data.dueDate) {
    return false;
  }
  
  // Recurring pattern validation
  if (data.isRecurring && !data.recurringPattern) {
    return false;
  }
  
  // Date validation (only for non-recurring tasks with dueDate)
  if (!data.isRecurring && data.startDate && data.dueDate) {
    const startDate = new Date(data.startDate);
    const dueDate = new Date(data.dueDate);
    if (startDate >= dueDate) {
      return false;
    }
  }
  
  // Recurring end date validation
  if (data.isRecurring && data.recurringPattern?.endDate && data.startDate) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.recurringPattern.endDate);
    if (startDate >= endDate) {
      return false;
    }
  }
  
  return true;
}, {
  message: "Invalid task timing configuration",
  path: ["timing"]
});

//  Task update schema
const taskUpdateSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .trim()
    .optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  category: z.string()
    .optional(),
  assignees: z.array(z.string())
    .optional(), // Array of ObjectId strings - users to assign task to
  startDate: z.string()
    .datetime('Please enter a valid start date and time')
    .optional(),
  
  //  Either duration or dueDate (for backward compatibility)
  duration: durationSchema.optional(),
  dueDate: z.string()
    .datetime('Please enter a valid due date and time')
    .optional(),
  
  isRecurring: z.boolean().optional(),
  recurringPattern: recurringPatternSchema.optional(),
  editScope: z.enum(['this_instance', 'this_and_future', 'all_instances']).optional()
}).refine((data) => {
  // Can't have both duration and dueDate
  if (data.duration && data.dueDate) {
    return false;
  }
  
  // If isRecurring is true, recurringPattern must be provided
  if (data.isRecurring && !data.recurringPattern) {
    return false;
  }
  
  // If recurringPattern is provided, isRecurring must be true
  if (data.recurringPattern && data.isRecurring === false) {
    return false;
  }
  
  // For recurring tasks, duration is required if provided
  if (data.isRecurring && data.recurringPattern && !data.duration) {
    return false;
  }
  
  return true;
}, {
  message: "Invalid task update configuration",
  path: ["update"]
});

// Task status update schema
const taskStatusUpdateSchema = z.object({
  status: taskStatusSchema
});

// Task assignment schema
const taskAssignmentSchema = z.object({
  assignees: z.array(z.string())
    .min(1, 'Please assign this task to at least one person') // Array of ObjectId strings
});

// Task sharing schema
const taskSharingSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address (e.g., user@example.com)')
    .toLowerCase()
    .trim(),
  permission: taskPermissionSchema
});

export {
  taskStatusSchema,
  taskPrioritySchema,
  taskPermissionSchema,
  recurringPatternSchema,
  durationSchema,
  taskCreateSchema,
  taskUpdateSchema,
  taskStatusUpdateSchema,
  taskAssignmentSchema,
  taskSharingSchema
};