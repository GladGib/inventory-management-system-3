import { z } from 'zod';
import { descriptionSchema } from './common';

/**
 * Zod validation schemas for Payment Terms.
 */

/** Schema for creating a new payment term */
export const paymentTermSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),
  days: z.coerce
    .number()
    .int('Days must be a whole number')
    .min(0, 'Days cannot be negative')
    .max(999, 'Days exceeds maximum allowed value'),
  description: descriptionSchema,
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

/** Schema for updating an existing payment term */
export const paymentTermUpdateSchema = paymentTermSchema.partial().extend({
  id: z.string().min(1, 'Payment term ID is required'),
});

/** Inferred TypeScript types */
export type PaymentTermInput = z.infer<typeof paymentTermSchema>;
export type PaymentTermUpdateInput = z.infer<typeof paymentTermUpdateSchema>;
