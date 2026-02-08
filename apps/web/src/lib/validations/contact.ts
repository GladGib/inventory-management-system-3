import { z } from 'zod';
import {
  nameSchema,
  optionalEmailSchema,
  optionalPhoneSchema,
  optionalCurrencySchema,
  descriptionSchema,
  optionalAddressDataSchema,
} from './common';

/**
 * Zod validation schemas for Contact (Customer/Vendor) create/edit forms.
 */

/** Schema for creating a new contact */
export const createContactSchema = z.object({
  type: z.enum(['CUSTOMER', 'VENDOR', 'BOTH'], {
    message: 'Contact type is required',
  }),
  companyName: nameSchema,
  displayName: nameSchema,
  firstName: z
    .string()
    .max(50, 'First name must not exceed 50 characters')
    .optional()
    .or(z.literal(''))
    .nullable(),
  lastName: z
    .string()
    .max(50, 'Last name must not exceed 50 characters')
    .optional()
    .or(z.literal(''))
    .nullable(),
  email: optionalEmailSchema,
  phone: optionalPhoneSchema,
  mobile: optionalPhoneSchema,
  website: z
    .string()
    .url('Please enter a valid URL')
    .max(255, 'Website must not exceed 255 characters')
    .optional()
    .or(z.literal(''))
    .nullable(),
  taxNumber: z
    .string()
    .max(50, 'Tax number must not exceed 50 characters')
    .optional()
    .or(z.literal(''))
    .nullable(),
  creditLimit: optionalCurrencySchema,
  paymentTermId: z.string().optional().nullable(),
  priceListId: z.string().optional().nullable(),
  billingAddress: optionalAddressDataSchema,
  shippingAddress: optionalAddressDataSchema,
  notes: descriptionSchema,
});

/** Schema for updating an existing contact */
export const updateContactSchema = createContactSchema.partial();

/** Schema for creating a customer (type preset) */
export const createCustomerSchema = createContactSchema.extend({
  type: z.literal('CUSTOMER').default('CUSTOMER'),
});

/** Schema for creating a vendor (type preset) */
export const createVendorSchema = createContactSchema.extend({
  type: z.literal('VENDOR').default('VENDOR'),
});

/** Inferred TypeScript types */
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type CreateVendorInput = z.infer<typeof createVendorSchema>;
