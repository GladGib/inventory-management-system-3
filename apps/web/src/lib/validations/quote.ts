import { z } from 'zod';
import { quantitySchema, priceSchema, descriptionSchema, discountSchema } from './common';

/**
 * Zod validation schemas for Sales Quotes.
 */

/** Schema for a single quote line item */
export const quoteItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  quantity: z.coerce.number().pipe(quantitySchema),
  unitPrice: z.coerce.number().pipe(priceSchema),
  discount: z.coerce
    .number()
    .min(0, 'Discount must be 0 or greater')
    .default(0)
    .optional()
    .nullable(),
  description: descriptionSchema,
});

/** Schema for creating a new quote */
export const quoteSchema = z
  .object({
    customerId: z
      .string()
      .optional()
      .nullable(), // Allow null for walk-in customers
    quoteDate: z.string().min(1, 'Quote date is required'),
    validUntil: z.string().min(1, 'Valid until date is required'),
    notes: descriptionSchema,
    termsConditions: descriptionSchema,
    items: z
      .array(quoteItemSchema)
      .min(1, 'At least one item is required')
      .max(1000, 'Cannot have more than 1000 items in a quote'),
    discount: discountSchema.optional(),
  })
  .refine(
    (data) => {
      // Validate that validUntil is not before quoteDate
      if (data.quoteDate && data.validUntil) {
        const quoteDate = new Date(data.quoteDate);
        const validUntil = new Date(data.validUntil);
        return validUntil >= quoteDate;
      }
      return true;
    },
    {
      message: 'Valid until date must be on or after quote date',
      path: ['validUntil'],
    }
  );

/** Schema for converting quote to sales order */
export const quoteConvertSchema = z.object({
  quoteId: z.string().min(1, 'Quote ID is required'),
  orderDate: z.string().min(1, 'Order date is required').optional(),
  notes: descriptionSchema,
});

/** Schema for updating an existing quote */
export const quoteUpdateSchema = quoteSchema.partial().extend({
  id: z.string().min(1, 'Quote ID is required'),
});

/** Inferred TypeScript types */
export type QuoteItemInput = z.infer<typeof quoteItemSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;
export type QuoteConvertInput = z.infer<typeof quoteConvertSchema>;
export type QuoteUpdateInput = z.infer<typeof quoteUpdateSchema>;
