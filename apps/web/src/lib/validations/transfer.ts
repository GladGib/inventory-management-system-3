import { z } from 'zod';
import { quantitySchema, descriptionSchema } from './common';

/**
 * Zod validation schemas for Inventory Transfers.
 */

/** Schema for a single transfer line item */
export const transferItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  quantityRequested: z.coerce.number().pipe(quantitySchema),
  batchId: z.string().optional().nullable(),
  serialIds: z.array(z.string()).optional().default([]),
});

/** Schema for creating a new transfer */
export const transferSchema = z
  .object({
    sourceWarehouseId: z.string().min(1, 'Source warehouse is required'),
    targetWarehouseId: z.string().min(1, 'Target warehouse is required'),
    notes: descriptionSchema,
    items: z
      .array(transferItemSchema)
      .min(1, 'At least one item is required')
      .max(1000, 'Cannot transfer more than 1000 items at once'),
  })
  .refine((data) => data.sourceWarehouseId !== data.targetWarehouseId, {
    message: 'Source and target warehouses must be different',
    path: ['targetWarehouseId'],
  });

/** Schema for updating transfer status */
export const transferUpdateSchema = z.object({
  id: z.string().min(1, 'Transfer ID is required'),
  status: z.enum(['PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'], {
    message: 'Invalid transfer status',
  }),
  notes: descriptionSchema,
});

/** Inferred TypeScript types */
export type TransferItemInput = z.infer<typeof transferItemSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type TransferUpdateInput = z.infer<typeof transferUpdateSchema>;
