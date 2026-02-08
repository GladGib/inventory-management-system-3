import { z } from 'zod';
import {
  descriptionSchema,
  quantitySchema,
  priceSchema,
  optionalAddressDataSchema,
  discountSchema,
} from './common';

/**
 * Zod validation schemas for Invoice create/edit forms.
 */

/** Line item within an invoice */
export const invoiceItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  description: descriptionSchema,
  quantity: quantitySchema,
  unit: z.string().min(1, 'Unit is required').max(20),
  rate: priceSchema,
  discountType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  discountValue: z.number().min(0).default(0),
  taxRateId: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).optional().default(0),
});

/** Schema for creating a new invoice */
export const createInvoiceSchema = z.object({
  salesOrderId: z.string().optional().nullable(),
  customerId: z.string().min(1, 'Customer is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  billingAddress: optionalAddressDataSchema,
  paymentTermDays: z.number().int().min(0, 'Payment terms must be 0 or greater').default(30),
  ...discountSchema.shape,
  notes: descriptionSchema,
  termsConditions: descriptionSchema,
  items: z.array(invoiceItemSchema).min(1, 'At least one line item is required'),
});

/** Schema for updating an existing invoice */
export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  items: z.array(invoiceItemSchema).min(1, 'At least one line item is required').optional(),
});

/** Inferred TypeScript types */
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
