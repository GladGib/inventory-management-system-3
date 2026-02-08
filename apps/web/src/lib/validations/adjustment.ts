import { z } from 'zod';
import { descriptionSchema } from './common';

/**
 * Zod validation schemas for Inventory Adjustments.
 */

/** Schema for a single adjustment line item */
export const adjustmentItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  quantityAdjusted: z.coerce
    .number()
    .refine((val) => val !== 0, {
      message: 'Quantity cannot be zero',
    })
    .refine((val) => Math.abs(val) <= 99999999999.9999, {
      message: 'Quantity exceeds maximum allowed value',
    }),
  batchId: z.string().optional().nullable(),
  serialIds: z.array(z.string()).optional().default([]),
  notes: descriptionSchema,
});

/** Schema for creating a new inventory adjustment */
export const adjustmentSchema = z.object({
  warehouseId: z.string().min(1, 'Warehouse is required'),
  type: z.enum(['INCREASE', 'DECREASE'], {
    message: 'Type must be either INCREASE or DECREASE',
  }),
  reason: z
    .string()
    .min(1, 'Reason is required')
    .max(500, 'Reason must not exceed 500 characters')
    .trim(),
  notes: descriptionSchema,
  items: z
    .array(adjustmentItemSchema)
    .min(1, 'At least one item is required')
    .max(1000, 'Cannot adjust more than 1000 items at once'),
});

/** Schema for updating an adjustment */
export const adjustmentUpdateSchema = z.object({
  id: z.string().min(1, 'Adjustment ID is required'),
  status: z.enum(['DRAFT', 'APPROVED', 'REJECTED'], {
    message: 'Invalid adjustment status',
  }),
  notes: descriptionSchema,
});

/** Inferred TypeScript types */
export type AdjustmentItemInput = z.infer<typeof adjustmentItemSchema>;
export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
export type AdjustmentUpdateInput = z.infer<typeof adjustmentUpdateSchema>;
