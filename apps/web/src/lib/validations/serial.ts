import { z } from 'zod';
import { descriptionSchema } from './common';

/**
 * Zod validation schemas for Serial Number tracking.
 */

/** Schema for registering a single serial number */
export const serialRegistrationSchema = z.object({
  serialNumber: z
    .string()
    .min(1, 'Serial number is required')
    .max(100, 'Serial number must not exceed 100 characters')
    .trim(),
  itemId: z.string().min(1, 'Item is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  warrantyMonths: z.coerce
    .number()
    .int('Warranty months must be a whole number')
    .min(0, 'Warranty months cannot be negative')
    .max(999, 'Warranty months exceeds maximum allowed value')
    .optional()
    .nullable(),
  notes: descriptionSchema,
});

/** Schema for bulk serial number generation */
export const bulkSerialSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  prefix: z
    .string()
    .max(20, 'Prefix must not exceed 20 characters')
    .regex(/^[A-Za-z0-9\-_]*$/, 'Prefix can only contain letters, numbers, hyphens, and underscores')
    .optional()
    .or(z.literal(''))
    .nullable(),
  count: z.coerce
    .number()
    .int('Count must be a whole number')
    .min(1, 'Count must be at least 1')
    .max(1000, 'Cannot generate more than 1000 serial numbers at once'),
});

/** Schema for updating a serial number */
export const serialUpdateSchema = serialRegistrationSchema.partial().extend({
  id: z.string().min(1, 'Serial ID is required'),
});

/** Inferred TypeScript types */
export type SerialRegistrationInput = z.infer<typeof serialRegistrationSchema>;
export type BulkSerialInput = z.infer<typeof bulkSerialSchema>;
export type SerialUpdateInput = z.infer<typeof serialUpdateSchema>;
