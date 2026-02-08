import { z } from 'zod';

/**
 * Zod validation schemas for Malaysian e-Invoice (LHDN/MyInvois) settings.
 */

/** Schema for e-Invoice system configuration */
export const einvoiceSettingsSchema = z.object({
  tin: z
    .string()
    .min(12, 'TIN must be at least 12 characters')
    .max(14, 'TIN must not exceed 14 characters')
    .regex(/^[A-Z0-9]+$/, 'TIN must be uppercase alphanumeric')
    .optional()
    .or(z.literal(''))
    .nullable(),
  brn: z
    .string()
    .min(1, 'Business Registration Number is required when provided')
    .max(30, 'BRN must not exceed 30 characters')
    .optional()
    .or(z.literal(''))
    .nullable(),
  clientId: z
    .string()
    .max(255, 'Client ID must not exceed 255 characters')
    .optional()
    .or(z.literal(''))
    .nullable(),
  clientSecret: z
    .string()
    .max(255, 'Client Secret must not exceed 255 characters')
    .optional()
    .or(z.literal(''))
    .nullable(),
  isProduction: z.boolean().default(false),
  isEnabled: z.boolean().default(false),
  autoSubmit: z.boolean().default(false),
});

/** Schema for validating e-Invoice submission request */
export const einvoiceSubmitSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  validateOnly: z.boolean().default(false),
});

/** Inferred TypeScript types */
export type EinvoiceSettingsInput = z.infer<typeof einvoiceSettingsSchema>;
export type EinvoiceSubmitInput = z.infer<typeof einvoiceSubmitSchema>;
