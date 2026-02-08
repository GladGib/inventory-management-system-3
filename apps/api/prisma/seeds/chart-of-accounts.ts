/**
 * Default Chart of Accounts for Malaysian SME Businesses
 * Used to seed initial accounts for new organizations.
 *
 * Usage: Import and call seedChartOfAccounts(prisma, organizationId)
 * Or trigger via POST /accounting/chart-of-accounts/seed endpoint
 */

export interface DefaultAccount {
  accountCode: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
}

export const DEFAULT_CHART_OF_ACCOUNTS: DefaultAccount[] = [
  // ============ Assets (1xxx) ============
  { accountCode: '1000', name: 'Cash', type: 'ASSET' },
  { accountCode: '1100', name: 'Bank', type: 'ASSET' },
  { accountCode: '1200', name: 'Accounts Receivable', type: 'ASSET' },
  { accountCode: '1300', name: 'Inventory', type: 'ASSET' },

  // ============ Liabilities (2xxx) ============
  { accountCode: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
  { accountCode: '2100', name: 'Tax Payable (SST)', type: 'LIABILITY' },

  // ============ Equity (3xxx) ============
  { accountCode: '3000', name: "Owner's Equity", type: 'EQUITY' },
  { accountCode: '3100', name: 'Retained Earnings', type: 'EQUITY' },

  // ============ Revenue (4xxx) ============
  { accountCode: '4000', name: 'Sales Revenue', type: 'REVENUE' },
  { accountCode: '4100', name: 'Other Income', type: 'REVENUE' },

  // ============ Expenses (5xxx-6xxx) ============
  { accountCode: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' },
  { accountCode: '5100', name: 'Purchases', type: 'EXPENSE' },
  { accountCode: '6000', name: 'Operating Expenses', type: 'EXPENSE' },
  { accountCode: '6100', name: 'Salaries', type: 'EXPENSE' },
  { accountCode: '6200', name: 'Rent', type: 'EXPENSE' },
  { accountCode: '6300', name: 'Utilities', type: 'EXPENSE' },
];

/**
 * Seed the default chart of accounts for an organization.
 * Only creates accounts if the organization has no existing accounts.
 */
export async function seedChartOfAccounts(
  prisma: any,
  organizationId: string,
): Promise<{ count: number }> {
  const existingCount = await prisma.chartOfAccount.count({
    where: { organizationId },
  });

  if (existingCount > 0) {
    console.log(`Organization ${organizationId} already has ${existingCount} accounts, skipping seed.`);
    return { count: 0 };
  }

  const results = await prisma.$transaction(
    DEFAULT_CHART_OF_ACCOUNTS.map((account) =>
      prisma.chartOfAccount.create({
        data: {
          accountCode: account.accountCode,
          name: account.name,
          type: account.type,
          isSystem: true,
          isActive: true,
          organizationId,
        },
      }),
    ),
  );

  console.log(`Seeded ${results.length} default accounts for organization ${organizationId}`);
  return { count: results.length };
}
