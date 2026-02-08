import { z } from 'zod';
import { quantitySchema, descriptionSchema } from './common';

/**
 * Zod validation schemas for Batch create/edit forms.
 */

/** Schema for creating a new batch */
export const batchCreateSchema = z.object({
  batchNumber: z
    .string()
    .min(1, 'Batch number is required')
    .max(100, 'Batch number must not exceed 100 characters')
    .trim(),
  itemId: z.string().min(1, 'Item is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  quantity: z.coerce.number().pipe(quantitySchema),
  manufactureDate: z
    .string()
    .optional()
    .or(z.literal(''))
    .nullable(),
  expiryDate: z
    .string()
    .optional()
    .or(z.literal(''))
    .nullable(),
  notes: descriptionSchema,
});

/** Schema for updating an existing batch */
export const batchUpdateSchema = batchCreateSchema.partial().extend({
  id: z.string().min(1, 'Batch ID is required'),
});

/** Inferred TypeScript types */
export type BatchCreateInput = z.infer<typeof batchCreateSchema>;
export type BatchUpdateInput = z.infer<typeof batchUpdateSchema>;
