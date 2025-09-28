import { z } from 'zod';

// Category creation schema
const categoryCreateSchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(50, 'Category name must be less than 50 characters')
    .trim(),
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Please select a valid color from the color picker')
    .optional()
});

// Category update schema
const categoryUpdateSchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(50, 'Category name must be less than 50 characters')
    .trim()
    .optional(),
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Please select a valid color from the color picker')
    .optional()
});

export {
  categoryCreateSchema,
  categoryUpdateSchema
};