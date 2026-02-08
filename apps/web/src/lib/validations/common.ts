import { z } from 'zod';

/**
 * Shared validation rules for Malaysian business context.
 */

/** Malaysian phone number: +60 followed by 9-10 digits */
export const phoneSchema = z
  .string()
  .regex(/^\+60\d{9,10}$/, 'Phone number must be in +60 format (e.g., +60123456789)')
  .or(z.literal(''))
  .optional();

/** Flexible phone for optional fields - allows empty */
export const optionalPhoneSchema = z
  .string()
  .regex(/^\+60\d{9,10}$/, 'Phone number must be in +60 format (e.g., +60123456789)')
  .optional()
  .or(z.literal(''))
  .nullable();

/** Email validation */
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .max(255, 'Email must not exceed 255 characters');

/** Optional email */
export const optionalEmailSchema = z
  .string()
  .email('Please enter a valid email address')
  .max(255, 'Email must not exceed 255 characters')
  .optional()
  .or(z.literal(''))
  .nullable();

/** Malaysian postcode: exactly 5 digits */
export const postcodeSchema = z.string().regex(/^\d{5}$/, 'Postcode must be exactly 5 digits');

/** Optional postcode */
export const optionalPostcodeSchema = z
  .string()
  .regex(/^\d{5}$/, 'Postcode must be exactly 5 digits')
  .optional()
  .or(z.literal(''))
  .nullable();

/** MYR currency amount: non-negative, up to 2 decimal places */
export const currencySchema = z
  .number()
  .min(0, 'Amount must be 0 or greater')
  .multipleOf(0.01, 'Amount must have at most 2 decimal places');

/** MYR currency that can be optional */
export const optionalCurrencySchema = z
  .number()
  .min(0, 'Amount must be 0 or greater')
  .multipleOf(0.01, 'Amount must have at most 2 decimal places')
  .optional()
  .nullable();

/** Price amount: non-negative, up to 4 decimal places for unit pricing */
export const priceSchema = z
  .number()
  .min(0, 'Price must be 0 or greater')
  .max(99999999999.9999, 'Price exceeds maximum allowed value');

/** Quantity: positive number, up to 4 decimal places */
export const quantitySchema = z
  .number()
  .min(0.0001, 'Quantity must be greater than 0')
  .max(99999999999.9999, 'Quantity exceeds maximum allowed value');

/** Non-negative quantity (allows 0) */
export const nonNegativeQuantitySchema = z
  .number()
  .min(0, 'Quantity cannot be negative')
  .max(99999999999.9999, 'Quantity exceeds maximum allowed value');

/** SKU format: alphanumeric with hyphens, 2-50 chars */
export const skuSchema = z
  .string()
  .min(2, 'SKU must be at least 2 characters')
  .max(50, 'SKU must not exceed 50 characters')
  .regex(/^[A-Za-z0-9\-_]+$/, 'SKU can only contain letters, numbers, hyphens, and underscores');

/** Standard name field */
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(200, 'Name must not exceed 200 characters')
  .trim();

/** Optional description/notes field */
export const descriptionSchema = z
  .string()
  .max(2000, 'Description must not exceed 2000 characters')
  .optional()
  .or(z.literal(''))
  .nullable();

/** Percentage value: 0-100 */
export const percentageSchema = z
  .number()
  .min(0, 'Percentage must be 0 or greater')
  .max(100, 'Percentage must not exceed 100');

/** Tax rate percentage: 0-100, up to 2 decimal places */
export const taxRateSchema = z
  .number()
  .min(0, 'Tax rate must be 0 or greater')
  .max(100, 'Tax rate must not exceed 100')
  .multipleOf(0.01, 'Tax rate must have at most 2 decimal places');

/** SST registration number */
export const sstNumberSchema = z
  .string()
  .regex(/^[A-Z0-9-]+$/, 'Invalid SST registration number format')
  .optional()
  .or(z.literal(''))
  .nullable();

/** Malaysian business registration number (SSM) */
export const businessRegNoSchema = z
  .string()
  .min(5, 'Business registration number is too short')
  .max(30, 'Business registration number is too long')
  .optional()
  .or(z.literal(''))
  .nullable();

/** Address sub-schema for inline address JSON */
export const addressDataSchema = z.object({
  addressLine1: z.string().min(1, 'Address line 1 is required').max(255),
  addressLine2: z.string().max(255).optional().or(z.literal('')).nullable(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  postcode: postcodeSchema,
  country: z.string().default('Malaysia'),
  phone: optionalPhoneSchema,
  attention: z.string().max(100).optional().or(z.literal('')).nullable(),
});

/** Optional address data */
export const optionalAddressDataSchema = addressDataSchema.partial().optional().nullable();

/** Discount sub-schema used across transactions */
export const discountSchema = z.object({
  discountType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  discountValue: z.number().min(0, 'Discount must be 0 or greater').default(0),
});
