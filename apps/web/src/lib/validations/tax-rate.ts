import { z } from 'zod';
import { taxRateSchema as taxRatePercentageSchema, descriptionSchema } from './common';

/**
 * Zod validation schemas for Tax Rate configuration.
 */

/** Schema for creating a new tax rate */
export const taxRateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),
  code: z
    .string()
    .min(1, 'Code is required')
    .max(20, 'Code must not exceed 20 characters')
    .regex(/^[A-Z0-9_\-]+$/, 'Code must be uppercase alphanumeric with optional underscores/hyphens')
    .trim(),
  rate: z.coerce.number().pipe(taxRatePercentageSchema),
  type: z.enum(['SST', 'SERVICE_TAX', 'GST', 'EXEMPT', 'ZERO_RATED', 'OUT_OF_SCOPE'], {
    message: 'Invalid tax type',
  }),
  description: descriptionSchema,
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  effectiveFrom: z
    .string()
    .optional()
    .or(z.literal(''))
    .nullable(),
  effectiveTo: z
    .string()
    .optional()
    .or(z.literal(''))
    .nullable(),
});

/** Schema for updating an existing tax rate */
export const taxRateUpdateSchema = taxRateSchema.partial().extend({
  id: z.string().min(1, 'Tax rate ID is required'),
});

/** Inferred TypeScript types */
export type TaxRateInput = z.infer<typeof taxRateSchema>;
export type TaxRateUpdateInput = z.infer<typeof taxRateUpdateSchema>;
