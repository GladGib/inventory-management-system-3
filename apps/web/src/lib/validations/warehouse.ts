import { z } from 'zod';
import { optionalPhoneSchema, optionalEmailSchema, addressDataSchema } from './common';

/**
 * Zod validation schemas for Warehouse management.
 */

/** Schema for creating a new warehouse */
export const warehouseSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must not exceed 200 characters')
    .trim(),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(10, 'Code must not exceed 10 characters')
    .regex(/^[A-Z0-9\-]+$/, 'Code must be uppercase alphanumeric with optional hyphens')
    .trim(),
  phone: optionalPhoneSchema,
  email: optionalEmailSchema,
  address: addressDataSchema.optional().nullable(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

/** Schema for updating an existing warehouse */
export const warehouseUpdateSchema = warehouseSchema.partial().extend({
  id: z.string().min(1, 'Warehouse ID is required'),
});

/** Inferred TypeScript types */
export type WarehouseInput = z.infer<typeof warehouseSchema>;
export type WarehouseUpdateInput = z.infer<typeof warehouseUpdateSchema>;
