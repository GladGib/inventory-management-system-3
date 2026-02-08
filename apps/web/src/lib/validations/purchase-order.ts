import { z } from 'zod';
import {
  descriptionSchema,
  quantitySchema,
  priceSchema,
  optionalAddressDataSchema,
  discountSchema,
} from './common';

/**
 * Zod validation schemas for Purchase Order create/edit forms.
 */

/** Line item within a purchase order */
export const purchaseOrderItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  description: descriptionSchema,
  quantity: quantitySchema,
  unit: z.string().min(1, 'Unit is required').max(20),
  unitPrice: priceSchema,
  discountType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  discountPercent: z.number().min(0).max(100).default(0),
  taxRateId: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).optional().default(0),
});

/** Schema for creating a new purchase order */
export const createPurchaseOrderSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  orderDate: z.string().min(1, 'Order date is required'),
  expectedDate: z.string().optional().or(z.literal('')).nullable(),
  referenceNumber: z
    .string()
    .max(100, 'Reference must not exceed 100 characters')
    .optional()
    .or(z.literal(''))
    .nullable(),
  warehouseId: z.string().optional().nullable(),
  deliveryAddress: optionalAddressDataSchema,
  ...discountSchema.shape,
  shippingCharges: z.number().min(0, 'Shipping charges must be 0 or greater').default(0),
  notes: descriptionSchema,
  termsConditions: descriptionSchema,
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one line item is required'),
});

/** Schema for updating an existing purchase order */
export const updatePurchaseOrderSchema = createPurchaseOrderSchema.partial().extend({
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one line item is required').optional(),
});

/** Inferred TypeScript types */
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
export type PurchaseOrderItemInput = z.infer<typeof purchaseOrderItemSchema>;
