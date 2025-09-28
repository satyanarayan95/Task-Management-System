import { z } from 'zod';

// Activity type enum
const activityTypeSchema = z.enum([
  'task_created', 'task_updated', 'task_deleted', 'task_assigned', 'task_completed',
  'task_status_changed', 'task_priority_changed', 'task_due_date_changed',
  'category_created', 'category_updated', 'category_deleted',
  'comment_added', 'task_shared', 'task_unshared'
]);

// Activity creation schema
const activityCreateSchema = z.object({
  user: z.string().min(1, 'User ID is required'), // ObjectId as string
  type: activityTypeSchema,
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters')
    .trim(),
  task: z.string().optional(), // ObjectId as string
  category: z.string().optional(), // ObjectId as string
  assignee: z.string().optional(), // ObjectId as string
  metadata: z.record(z.any()).optional().default({})
});

// Activity query schema for filtering
const activityQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  type: z.string().optional(),
  user: z.string().optional(),
  date: z.enum(['all', 'today', 'week', 'month']).optional(),
  search: z.string().optional(),
  taskId: z.string().optional()
});

export {
  activityTypeSchema,
  activityCreateSchema,
  activityQuerySchema
};
