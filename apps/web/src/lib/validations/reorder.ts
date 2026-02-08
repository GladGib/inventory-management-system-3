import { z } from 'zod';
import { nonNegativeQuantitySchema, quantitySchema } from './common';

/**
 * Zod validation schemas for Reorder Point settings.
 */

/** Schema for reorder point configuration */
export const reorderSettingsSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  reorderLevel: z.coerce.number().pipe(nonNegativeQuantitySchema),
  reorderQuantity: z.coerce.number().pipe(quantitySchema),
  safetyStock: z.coerce
    .number()
    .pipe(nonNegativeQuantitySchema)
    .default(0),
  leadTimeDays: z.coerce
    .number()
    .int('Lead time must be a whole number')
    .min(0, 'Lead time cannot be negative')
    .max(999, 'Lead time exceeds maximum allowed value')
    .default(0),
  preferredVendorId: z
    .string()
    .optional()
    .nullable(),
  autoReorder: z.boolean().default(false),
});

/** Schema for updating reorder settings */
export const reorderUpdateSchema = reorderSettingsSchema.partial();

/** Inferred TypeScript types */
export type ReorderSettingsInput = z.infer<typeof reorderSettingsSchema>;
export type ReorderUpdateInput = z.infer<typeof reorderUpdateSchema>;
