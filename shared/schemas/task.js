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

// Recurring pattern types
const recurringTypeSchema = z.enum(['daily', 'weekly', 'monthly', 'custom'], {
  errorMap: () => ({ message: 'Please select a valid recurrence type' })
});

// Recurring pattern validation
const recurringPatternSchema = z.object({
  type: recurringTypeSchema,
  interval: z.number().min(1, 'Interval must be at least 1').max(365, 'Interval cannot exceed 365').optional(), // e.g., every 2 days
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(), // 0=Sunday, 6=Saturday
  dayOfMonth: z.number().min(1, 'Day must be between 1 and 31').max(31, 'Day must be between 1 and 31').optional(),
  endDate: z.string().datetime('Please enter a valid end date').optional(),
  occurrences: z.number().min(1, 'Must have at least 1 occurrence').max(1000, 'Cannot exceed 1000 occurrences').optional()
});

// Task creation schema
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
  dueDate: z.string()
    .datetime('Please enter a valid due date and time')
    .optional(),
  isRecurring: z.boolean().default(false),
  recurringPattern: recurringPatternSchema.optional()
}).refine((data) => {
  // If isRecurring is true, recurringPattern must be provided
  if (data.isRecurring && !data.recurringPattern) {
    return false;
  }
  // If recurringPattern is provided, isRecurring must be true
  if (data.recurringPattern && !data.isRecurring) {
    return false;
  }
  return true;
}, {
  message: "Please configure the recurrence settings for recurring tasks",
  path: ["recurringPattern"]
});

// Task update schema
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
  dueDate: z.string()
    .datetime('Please enter a valid due date and time')
    .optional(),
  isRecurring: z.boolean().optional(),
  recurringPattern: recurringPatternSchema.optional(),
  editScope: z.enum(['this_instance', 'this_and_future', 'all_instances']).optional()
}).refine((data) => {
  // If isRecurring is true, recurringPattern must be provided
  if (data.isRecurring && !data.recurringPattern) {
    return false;
  }
  return true;
}, {
  message: "Please configure the recurrence settings for recurring tasks",
  path: ["recurringPattern"]
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
  recurringTypeSchema,
  recurringPatternSchema,
  taskCreateSchema,
  taskUpdateSchema,
  taskStatusUpdateSchema,
  taskAssignmentSchema,
  taskSharingSchema
};