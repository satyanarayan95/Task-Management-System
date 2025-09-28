import { z } from 'zod';

// Notification type enum
const notificationTypeSchema = z.enum(['reminder', 'overdue', 'shared_task']);

// Notification creation schema
const notificationCreateSchema = z.object({
  type: notificationTypeSchema,
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  message: z.string()
    .min(1, 'Message is required')
    .max(500, 'Message must be less than 500 characters')
    .trim(),
  relatedTask: z.string()
    .optional() // ObjectId as string
});

export {
  notificationTypeSchema,
  notificationCreateSchema
};