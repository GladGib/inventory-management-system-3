import { z } from 'zod';
import {
  descriptionSchema,
  quantitySchema,
  priceSchema,
  optionalAddressDataSchema,
  discountSchema,
} from './common';

/**
 * Zod validation schemas for Sales Order create/edit forms.
 */

/** Line item within a sales order */
export const salesOrderItemSchema = z.object({
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

/** Schema for creating a new sales order */
export const createSalesOrderSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  orderDate: z.string().min(1, 'Order date is required'),
  expectedShipDate: z.string().optional().or(z.literal('')).nullable(),
  salesPersonId: z.string().optional().nullable(),
  warehouseId: z.string().optional().nullable(),
  referenceNumber: z
    .string()
    .max(100, 'Reference must not exceed 100 characters')
    .optional()
    .or(z.literal(''))
    .nullable(),
  shippingAddress: optionalAddressDataSchema,
  billingAddress: optionalAddressDataSchema,
  ...discountSchema.shape,
  shippingCharges: z.number().min(0, 'Shipping charges must be 0 or greater').default(0),
  notes: descriptionSchema,
  termsConditions: descriptionSchema,
  items: z.array(salesOrderItemSchema).min(1, 'At least one line item is required'),
});

/** Schema for updating an existing sales order */
export const updateSalesOrderSchema = createSalesOrderSchema.partial().extend({
  items: z.array(salesOrderItemSchema).min(1, 'At least one line item is required').optional(),
});

/** Inferred TypeScript types */
export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
export type UpdateSalesOrderInput = z.infer<typeof updateSalesOrderSchema>;
export type SalesOrderItemInput = z.infer<typeof salesOrderItemSchema>;
