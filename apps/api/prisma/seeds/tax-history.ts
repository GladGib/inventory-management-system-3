/**
 * Malaysian Tax History Seed Data
 *
 * Historical timeline of Malaysian indirect taxes:
 * - GST 6%:       1 April 2015 to 31 August 2018
 * - Tax Holiday:  1 September 2018 to 31 December 2018 (0% across the board)
 * - SST 10%:      1 January 2019 onwards (Sales Tax on manufactured goods)
 * - SST 6%:       1 January 2019 onwards (Service Tax on prescribed services)
 *
 * Usage:
 *   import { seedTaxHistory } from './seeds/tax-history';
 *   await seedTaxHistory(prisma, organizationId);
 */

import { PrismaClient } from '@prisma/client';

export interface TaxHistorySeedRate {
  name: string;
  code: string;
  rate: number;
  type: 'SST' | 'SERVICE_TAX' | 'GST' | 'EXEMPT' | 'ZERO_RATED' | 'OUT_OF_SCOPE';
  taxRegime: 'GST' | 'TAX_HOLIDAY' | 'SST';
  description: string;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  isActive: boolean;
  isDefault: boolean;
}

/**
 * Default Malaysian tax rate history covering the GST-to-SST transition.
 */
export const MALAYSIAN_TAX_HISTORY: TaxHistorySeedRate[] = [
  // --- GST Era (1 Apr 2015 - 31 Aug 2018) ---
  {
    name: 'GST Standard Rate 6%',
    code: 'GST6',
    rate: 6,
    type: 'GST',
    taxRegime: 'GST',
    description: 'Standard GST rate at 6% applicable from 1 April 2015 to 31 August 2018',
    effectiveFrom: new Date('2015-04-01T00:00:00.000Z'),
    effectiveTo: new Date('2018-08-31T23:59:59.999Z'),
    isActive: false,
    isDefault: false,
  },
  {
    name: 'GST Zero Rated',
    code: 'GST0',
    rate: 0,
    type: 'ZERO_RATED',
    taxRegime: 'GST',
    description: 'Zero-rated supply under GST (e.g., basic food items, exports)',
    effectiveFrom: new Date('2015-04-01T00:00:00.000Z'),
    effectiveTo: new Date('2018-08-31T23:59:59.999Z'),
    isActive: false,
    isDefault: false,
  },
  {
    name: 'GST Exempt',
    code: 'GSTEX',
    rate: 0,
    type: 'EXEMPT',
    taxRegime: 'GST',
    description: 'Exempt supply under GST (e.g., residential property, financial services)',
    effectiveFrom: new Date('2015-04-01T00:00:00.000Z'),
    effectiveTo: new Date('2018-08-31T23:59:59.999Z'),
    isActive: false,
    isDefault: false,
  },

  // --- Tax Holiday (1 Sep 2018 - 31 Dec 2018) ---
  {
    name: 'Tax Holiday 0%',
    code: 'TH0',
    rate: 0,
    type: 'ZERO_RATED',
    taxRegime: 'TAX_HOLIDAY',
    description: 'Tax holiday period - 0% tax on all goods and services (1 Sep 2018 to 31 Dec 2018)',
    effectiveFrom: new Date('2018-09-01T00:00:00.000Z'),
    effectiveTo: new Date('2018-12-31T23:59:59.999Z'),
    isActive: false,
    isDefault: false,
  },

  // --- SST Era (1 Jan 2019 - present) ---
  {
    name: 'Sales Tax 10%',
    code: 'ST10',
    rate: 10,
    type: 'SST',
    taxRegime: 'SST',
    description: 'SST Sales Tax at 10% on taxable manufactured goods (1 Jan 2019 onwards)',
    effectiveFrom: new Date('2019-01-01T00:00:00.000Z'),
    effectiveTo: null,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Sales Tax 5%',
    code: 'ST5',
    rate: 5,
    type: 'SST',
    taxRegime: 'SST',
    description: 'SST Sales Tax at 5% on specific goods (e.g., certain food preparations)',
    effectiveFrom: new Date('2019-01-01T00:00:00.000Z'),
    effectiveTo: null,
    isActive: true,
    isDefault: false,
  },
  {
    name: 'Service Tax 6%',
    code: 'ST6',
    rate: 6,
    type: 'SERVICE_TAX',
    taxRegime: 'SST',
    description: 'SST Service Tax at 6% on prescribed taxable services (1 Jan 2019 onwards)',
    effectiveFrom: new Date('2019-01-01T00:00:00.000Z'),
    effectiveTo: null,
    isActive: true,
    isDefault: false,
  },
  {
    name: 'Service Tax 8%',
    code: 'ST8',
    rate: 8,
    type: 'SERVICE_TAX',
    taxRegime: 'SST',
    description: 'SST Service Tax at 8% on credit card and charge card services',
    effectiveFrom: new Date('2019-01-01T00:00:00.000Z'),
    effectiveTo: null,
    isActive: true,
    isDefault: false,
  },
  {
    name: 'Tax Exempt',
    code: 'EX',
    rate: 0,
    type: 'EXEMPT',
    taxRegime: 'SST',
    description: 'Exempt from SST (e.g., essential goods, agricultural produce)',
    effectiveFrom: new Date('2019-01-01T00:00:00.000Z'),
    effectiveTo: null,
    isActive: true,
    isDefault: false,
  },
  {
    name: 'Zero Rated',
    code: 'ZR',
    rate: 0,
    type: 'ZERO_RATED',
    taxRegime: 'SST',
    description: 'Zero-rated under SST',
    effectiveFrom: new Date('2019-01-01T00:00:00.000Z'),
    effectiveTo: null,
    isActive: true,
    isDefault: false,
  },
  {
    name: 'Out of Scope',
    code: 'OS',
    rate: 0,
    type: 'OUT_OF_SCOPE',
    taxRegime: 'SST',
    description: 'Outside the scope of SST',
    effectiveFrom: null,
    effectiveTo: null,
    isActive: true,
    isDefault: false,
  },
];

/**
 * Seeds the organization with historical Malaysian tax rates.
 * Skips any rates where the code already exists for the organization.
 *
 * @param prisma  PrismaClient instance
 * @param organizationId  The organization to seed rates for
 * @param overwrite  If true, deletes existing rates first (default: false)
 * @returns Summary of created rates
 */
export async function seedTaxHistory(
  prisma: PrismaClient,
  organizationId: string,
  overwrite = false,
) {
  if (overwrite) {
    await prisma.taxRate.deleteMany({ where: { organizationId } });
  }

  const existingCodes = await prisma.taxRate.findMany({
    where: { organizationId },
    select: { code: true },
  });
  const existingCodeSet = new Set(existingCodes.map((r) => r.code));

  const toCreate = MALAYSIAN_TAX_HISTORY.filter(
    (rate) => !existingCodeSet.has(rate.code),
  );

  const created = await Promise.all(
    toCreate.map((rate) =>
      prisma.taxRate.create({
        data: {
          name: rate.name,
          code: rate.code,
          rate: rate.rate,
          type: rate.type,
          taxRegime: rate.taxRegime,
          description: rate.description,
          effectiveFrom: rate.effectiveFrom,
          effectiveTo: rate.effectiveTo,
          isActive: rate.isActive,
          isDefault: rate.isDefault,
          organizationId,
        },
      }),
    ),
  );

  return {
    message: `Malaysian tax history seeded: ${created.length} rates created, ${existingCodeSet.size} already existed`,
    created: created.length,
    skipped: existingCodeSet.size,
    rates: created,
  };
}
