import { z } from 'zod';
import {
  skuSchema,
  nameSchema,
  descriptionSchema,
  priceSchema,
  nonNegativeQuantitySchema,
} from './common';

/**
 * Zod validation schemas for Item create/edit forms.
 */

/** Schema for creating a new item */
export const createItemSchema = z.object({
  sku: skuSchema,
  name: nameSchema,
  nameMalay: z
    .string()
    .max(200, 'Malay name must not exceed 200 characters')
    .optional()
    .or(z.literal(''))
    .nullable(),
  description: descriptionSchema,
  type: z.enum(['INVENTORY', 'SERVICE', 'NON_INVENTORY', 'COMPOSITE'], {
    message: 'Item type is required',
  }),
  unit: z
    .string()
    .min(1, 'Unit is required')
    .max(20, 'Unit must not exceed 20 characters')
    .default('pcs'),
  brand: z
    .string()
    .max(100, 'Brand must not exceed 100 characters')
    .optional()
    .or(z.literal(''))
    .nullable(),
  partNumber: z
    .string()
    .max(100, 'Part number must not exceed 100 characters')
    .optional()
    .or(z.literal(''))
    .nullable(),
  crossReferences: z.array(z.string().max(100)).optional().default([]),
  vehicleModels: z.array(z.string().max(100)).optional().default([]),
  categoryId: z.string().optional().nullable(),
  itemGroupId: z.string().optional().nullable(),

  // Pricing
  costPrice: priceSchema.default(0),
  sellingPrice: priceSchema.default(0),

  // Inventory settings
  reorderLevel: nonNegativeQuantitySchema.default(0),
  reorderQty: nonNegativeQuantitySchema.default(0),
  trackInventory: z.boolean().default(true),
  trackBatches: z.boolean().default(false),
  trackSerials: z.boolean().default(false),

  // Tax
  taxable: z.boolean().default(true),
  taxRateId: z.string().optional().nullable(),

  // Media
  images: z.array(z.string().url('Invalid image URL')).optional().default([]),
});

/** Schema for updating an existing item */
export const updateItemSchema = createItemSchema.partial();

/** Inferred TypeScript types */
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
