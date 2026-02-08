import { z } from 'zod';
import { quantitySchema, percentageSchema, descriptionSchema } from './common';

/**
 * Zod validation schemas for Composite Items (Bill of Materials).
 */

/** Schema for a single BOM component */
export const bomComponentSchema = z.object({
  componentItemId: z.string().min(1, 'Component item is required'),
  quantity: z.coerce.number().pipe(quantitySchema),
  wastagePercent: z.coerce
    .number()
    .pipe(percentageSchema)
    .optional()
    .nullable()
    .default(0),
  notes: descriptionSchema,
});

/** Schema for creating/updating a Bill of Materials */
export const bomSchema = z.object({
  compositeItemId: z.string().min(1, 'Composite item is required'),
  components: z
    .array(bomComponentSchema)
    .min(1, 'At least one component is required')
    .max(100, 'Cannot have more than 100 components'),
});

/** Schema for creating a composite item assembly */
export const assemblyCreateSchema = z.object({
  compositeItemId: z.string().min(1, 'Composite item is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  quantity: z.coerce.number().pipe(quantitySchema),
  notes: descriptionSchema,
});

/** Inferred TypeScript types */
export type BomComponentInput = z.infer<typeof bomComponentSchema>;
export type BomInput = z.infer<typeof bomSchema>;
export type AssemblyCreateInput = z.infer<typeof assemblyCreateSchema>;
