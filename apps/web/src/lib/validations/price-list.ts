import { z } from 'zod';
import { descriptionSchema, priceSchema, nonNegativeQuantitySchema } from './common';

/**
 * Zod validation schemas for Price Lists.
 */

/** Schema for creating a new price list */
export const priceListSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must not exceed 200 characters')
    .trim(),
  description: descriptionSchema,
  type: z.enum(['SALES', 'PURCHASE'], {
    message: 'Type must be either SALES or PURCHASE',
  }),
  markupType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  markupValue: z.coerce
    .number()
    .min(0, 'Markup value must be 0 or greater')
    .default(0),
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
  isActive: z.boolean().default(true),
});

/** Schema for a price list item (item-specific pricing) */
export const priceListItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  customPrice: z.coerce.number().pipe(priceSchema),
  minQuantity: z.coerce
    .number()
    .pipe(nonNegativeQuantitySchema)
    .default(1)
    .refine((qty) => qty >= 1, 'Minimum quantity must be at least 1'),
});

/** Schema for updating an existing price list */
export const priceListUpdateSchema = priceListSchema.partial().extend({
  id: z.string().min(1, 'Price list ID is required'),
});

/** Inferred TypeScript types */
export type PriceListInput = z.infer<typeof priceListSchema>;
export type PriceListItemInput = z.infer<typeof priceListItemSchema>;
export type PriceListUpdateInput = z.infer<typeof priceListUpdateSchema>;
