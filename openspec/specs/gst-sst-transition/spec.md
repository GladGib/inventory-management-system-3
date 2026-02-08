# GST/SST Historical Transition

## Overview
Support for Malaysia's historical tax regime transitions: GST (6%, until 31 Aug 2018), Tax Holiday (0%, 1 Sep - 31 Dec 2018), and SST (10% Sales Tax / 6% Service Tax, from 1 Jan 2019 onwards). The tax calculation engine must resolve the correct rate based on the document/transaction date rather than the current date, enabling accurate historical reporting and mixed-regime document handling.

## Requirements

### GST-001: Tax Regime Enum
- **Priority**: P1
- **Description**: Add tax regime classification to tax rates
- **Acceptance Criteria**:
  - New `taxRegime` field on TaxRate model: GST, SST, TAX_HOLIDAY
  - All existing SST rates tagged as SST regime
  - Historical GST rates tagged as GST regime
  - Tax holiday rates tagged as TAX_HOLIDAY regime
  - Regime is informational and used for reporting grouping

### GST-002: Effective Date Enforcement
- **Priority**: P1
- **Description**: Tax rates have strict effective date ranges
- **Acceptance Criteria**:
  - `effectiveFrom` and `effectiveTo` dates on TaxRate model (already exist but must be enforced)
  - Tax rate is only applicable within its effective date range
  - `effectiveTo` is null for currently active rates (no end date)
  - Date ranges must not overlap for the same tax code within the same regime
  - Validation prevents creating overlapping date ranges

### GST-003: Date-Aware Tax Calculation
- **Priority**: P1
- **Description**: Tax calculation engine resolves rate based on transaction date
- **Acceptance Criteria**:
  - Tax calculation accepts a `transactionDate` parameter
  - Lookup finds the tax rate whose effectiveFrom <= transactionDate AND (effectiveTo >= transactionDate OR effectiveTo IS NULL)
  - If no rate is found for the given date, return an error (not a zero rate)
  - Invoice tax uses invoiceDate for rate resolution
  - Sales order tax uses orderDate for rate resolution
  - Bill tax uses billDate for rate resolution
  - Purchase order tax uses orderDate for rate resolution
  - Credit note tax uses creditDate for rate resolution
  - Adjustment tax uses adjustmentDate for rate resolution

### GST-004: Tax Rate Lookup API
- **Priority**: P1
- **Description**: API endpoint for date-aware tax rate lookup
- **Acceptance Criteria**:
  - New endpoint or parameter on existing tax calculation endpoint
  - Accepts `date` parameter (ISO date string)
  - Returns applicable tax rates for the given date
  - If `date` is omitted, uses current date (backward compatible)
  - Returns rate details including regime, code, rate percentage

### GST-005: Historical Tax Rate Configuration
- **Priority**: P1
- **Description**: UI for managing historical tax rates with date ranges
- **Acceptance Criteria**:
  - Tax rate list shows regime badge (GST, SST, TAX_HOLIDAY)
  - Filter by regime
  - Timeline view showing rate transitions
  - Date range validation prevents gaps or overlaps
  - Warning when editing an active rate's effectiveTo (could affect current transactions)
  - Read-only view for historical rates (rates with effectiveTo in the past)

### GST-006: Mixed-Period Reporting
- **Priority**: P2
- **Description**: Reports handle documents spanning multiple tax regimes
- **Acceptance Criteria**:
  - Tax summary report groups by regime
  - Date range reports that span GST-to-SST transition show separate totals per regime
  - SST Filing Summary excludes GST-period transactions
  - GST-period transactions clearly labelled in reports
  - Tax audit trail shows which regime each transaction falls under

### GST-007: Default Tax History Seed
- **Priority**: P1
- **Description**: Seed default Malaysian tax history on organization setup
- **Acceptance Criteria**:
  - Seed runs automatically when organization is created (or as migration for existing orgs)
  - Seeded rates:
    - GST Standard Rate: 6%, code "GST6", effectiveFrom 2015-04-01, effectiveTo 2018-08-31, regime GST
    - GST Zero-Rated: 0%, code "GST0", effectiveFrom 2015-04-01, effectiveTo 2018-08-31, regime GST
    - GST Exempt: 0%, code "GSTEX", effectiveFrom 2015-04-01, effectiveTo 2018-08-31, regime GST
    - Tax Holiday: 0%, code "TH0", effectiveFrom 2018-09-01, effectiveTo 2018-12-31, regime TAX_HOLIDAY
    - SST Sales Tax: 10%, code "ST10", effectiveFrom 2019-01-01, effectiveTo null, regime SST
    - SST Service Tax: 6%, code "SV6", effectiveFrom 2019-01-01, effectiveTo null, regime SST
    - SST Zero-Rated: 0%, code "ZR", effectiveFrom 2019-01-01, effectiveTo null, regime SST
    - SST Exempt: 0%, code "EX", effectiveFrom 2019-01-01, effectiveTo null, regime SST
  - Seeded rates have isSystem flag set to true
  - Do not duplicate if seed runs again (idempotent based on org + code + regime)

## Database Schema Changes

```prisma
// Modify existing TaxRate model:
model TaxRate {
  id             String     @id @default(cuid())
  organizationId String
  name           String
  code           String
  rate           Decimal    @db.Decimal(5, 2)
  type           TaxType    @default(SST)
  taxRegime      TaxRegime  @default(SST)   // NEW FIELD
  description    String?
  isDefault      Boolean    @default(false)
  isActive       Boolean    @default(true)
  isSystem       Boolean    @default(false)  // NEW FIELD (for seeded rates)
  status         Status     @default(ACTIVE)
  effectiveFrom  DateTime?  // Already exists - make required for regime tracking
  effectiveTo    DateTime?  // Already exists - null means "currently active"
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  // Relations
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  items        Item[]

  @@unique([organizationId, code])
  @@index([organizationId])
  @@index([type])
  @@index([taxRegime])
  @@index([isActive])
  @@index([effectiveFrom])
  @@index([effectiveTo])
}

// New enum:
enum TaxRegime {
  GST
  SST
  TAX_HOLIDAY
}
```

### Migration Notes

```sql
-- Add taxRegime column with default SST for existing rates
ALTER TABLE "TaxRate" ADD COLUMN "taxRegime" TEXT NOT NULL DEFAULT 'SST';

-- Add isSystem column with default false
ALTER TABLE "TaxRate" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- Add indexes
CREATE INDEX "TaxRate_taxRegime_idx" ON "TaxRate"("taxRegime");
CREATE INDEX "TaxRate_effectiveFrom_idx" ON "TaxRate"("effectiveFrom");
CREATE INDEX "TaxRate_effectiveTo_idx" ON "TaxRate"("effectiveTo");

-- Tag existing SST rates
UPDATE "TaxRate" SET "taxRegime" = 'SST' WHERE "taxRegime" IS NULL;
```

## API Endpoints

```
# Existing endpoints - modified behavior
GET    /api/settings/tax-rates                     - List tax rates (add ?regime=GST|SST|TAX_HOLIDAY filter)
POST   /api/settings/tax-rates                     - Create tax rate (accept taxRegime field)
PUT    /api/settings/tax-rates/:id                 - Update tax rate (validate date range overlaps)
POST   /api/tax/calculate                          - Calculate tax (accept transactionDate parameter)

# New endpoints
GET    /api/tax/lookup                             - Lookup applicable rates for a date
POST   /api/settings/tax-rates/seed-history        - Seed default Malaysian tax history (admin only)
GET    /api/reports/tax/regime-summary              - Tax summary grouped by regime
```

### Request/Response Schemas

```typescript
// Modified: POST /api/tax/calculate
interface TaxCalculateRequest {
  items: {
    itemId: string;
    quantity: number;
    unitPrice: number;
    taxRateId?: string;   // If provided, override item default
  }[];
  transactionDate: string; // ISO date - REQUIRED for date-aware calculation
  taxInclusive?: boolean;
}

interface TaxCalculateResponse {
  items: {
    itemId: string;
    subtotal: number;
    taxableAmount: number;
    taxAmount: number;
    total: number;
    appliedTaxRate: {
      id: string;
      code: string;
      name: string;
      rate: number;
      regime: TaxRegime;
    };
  }[];
  totals: {
    subtotal: number;
    taxAmount: number;
    total: number;
  };
  taxBreakdown: {
    taxCode: string;
    taxName: string;
    regime: TaxRegime;
    rate: number;
    taxableAmount: number;
    taxAmount: number;
  }[];
}

// GET /api/tax/lookup?date=2018-06-15
interface TaxLookupQuery {
  date: string; // ISO date
}

interface TaxLookupResponse {
  date: string;
  regime: TaxRegime;
  applicableRates: {
    id: string;
    code: string;
    name: string;
    rate: number;
    type: TaxType;
    effectiveFrom: string;
    effectiveTo: string | null;
  }[];
}

// GET /api/reports/tax/regime-summary?fromDate=2018-01-01&toDate=2019-12-31
interface TaxRegimeSummaryResponse {
  period: {
    from: string;
    to: string;
  };
  regimes: {
    regime: TaxRegime;
    label: string;        // "GST (6%)", "Tax Holiday (0%)", "SST (10%/6%)"
    effectiveFrom: string;
    effectiveTo: string | null;
    transactionCount: number;
    taxableAmount: number;
    taxCollected: number;  // Sales tax collected
    taxPaid: number;       // Input tax on purchases
    netTax: number;        // collected - paid
  }[];
  totals: {
    totalTransactions: number;
    totalTaxCollected: number;
    totalTaxPaid: number;
    netTax: number;
  };
}
```

## Frontend Pages

### Page Structure

```
apps/web/app/(dashboard)/settings/tax/
├── page.tsx                           # Tax rates list (modify existing)
├── components/
│   ├── TaxRateTable.tsx               # Updated with regime column and filter
│   ├── TaxRateFormModal.tsx           # Updated with regime and date range fields
│   ├── TaxRegimeFilter.tsx            # Regime filter pills (All, GST, Tax Holiday, SST)
│   ├── TaxHistoryTimeline.tsx         # Visual timeline of tax regime transitions
│   └── SeedHistoryButton.tsx          # Button to seed default history (admin only)
```

### Tax Rate Settings Page Modifications

```tsx
// Existing /settings/tax page modifications:

// 1. Add TaxRegimeFilter above the table
// - Pills: All | GST (2015-2018) | Tax Holiday (Sep-Dec 2018) | SST (2019+)
// - Active pill highlights with regime color

// 2. Add columns to TaxRateTable:
// - Regime: badge with color (GST=blue, TAX_HOLIDAY=yellow, SST=green)
// - Effective From: date formatted DD/MM/YYYY
// - Effective To: date formatted DD/MM/YYYY or "Current" if null

// 3. Add TaxHistoryTimeline component below filters:
// - Horizontal timeline showing regime transitions
// - GST block: Apr 2015 - Aug 2018 (blue)
// - Tax Holiday block: Sep 2018 - Dec 2018 (yellow)
// - SST block: Jan 2019 - Present (green)
// - Shows current date marker
// - Clickable blocks filter the table

// 4. Update TaxRateFormModal:
// - Add Tax Regime select (GST, SST, TAX_HOLIDAY)
// - Add Effective From date picker (required)
// - Add Effective To date picker (optional, null = current)
// - Validation: warn if date range overlaps with existing rate of same code
// - Disable regime and dates for isSystem rates (read-only)

// 5. Add Seed History button (visible to ADMIN role only):
// - Shows confirmation modal with list of rates that will be created
// - Disabled if history already seeded
// - Success notification listing created rates
```

### Tax-Related Form Modifications

```tsx
// All transaction forms must pass document date to tax calculation:

// Sales Order form:
// - orderDate field value is passed to tax calculation as transactionDate
// - When orderDate changes, recalculate line item taxes

// Invoice form:
// - invoiceDate field value is passed to tax calculation as transactionDate
// - When invoiceDate changes, recalculate line item taxes

// Bill form:
// - billDate field value is passed to tax calculation as transactionDate

// Purchase Order form:
// - orderDate field value is passed to tax calculation as transactionDate

// Note: The tax rate dropdown in line items should only show rates
// applicable for the selected document date (filtered by effectiveFrom/To)
```

## Hooks

```typescript
// apps/web/hooks/use-tax.ts

// Modified existing hooks:
export function useTaxRates(filters?: {
  regime?: TaxRegime;
  type?: TaxType;
  isActive?: boolean;
  effectiveAt?: string;  // Only return rates effective at this date
});

export function useTaxCalculation(
  items: TaxCalcItem[],
  transactionDate: string,  // Required
  taxInclusive?: boolean,
);

// New hooks:
export function useTaxLookup(date: string);
export function useSeedTaxHistory();
export function useTaxRegimeSummary(fromDate: string, toDate: string);
export function useApplicableTaxRates(date: string); // Returns rates valid for a given date
```

## Business Logic

### Tax Rate Resolution Algorithm

```typescript
function resolveTaxRate(
  taxRateId: string,
  transactionDate: Date,
  organizationId: string,
): TaxRate | null {
  // 1. Find the tax rate by ID
  const taxRate = findById(taxRateId);
  if (!taxRate) return null;

  // 2. Check if the rate is effective on the transaction date
  if (taxRate.effectiveFrom && transactionDate < taxRate.effectiveFrom) {
    // Rate not yet effective - find alternative with same code
    return findAlternativeRate(taxRate.code, transactionDate, organizationId);
  }
  if (taxRate.effectiveTo && transactionDate > taxRate.effectiveTo) {
    // Rate expired - find alternative with same code
    return findAlternativeRate(taxRate.code, transactionDate, organizationId);
  }

  // 3. Rate is effective
  return taxRate;
}

function findAlternativeRate(
  code: string,
  transactionDate: Date,
  organizationId: string,
): TaxRate | null {
  // Find a rate with similar code pattern that is effective on the date
  // e.g., if code is "ST10" and date is in GST period,
  // try to find "GST6" or similar standard rate
  return prisma.taxRate.findFirst({
    where: {
      organizationId,
      effectiveFrom: { lte: transactionDate },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: transactionDate } },
      ],
      isActive: true,
    },
  });
}
```

### Transaction Date Validation

```typescript
// When creating/updating a transaction with a date in a different regime:
function validateTransactionTaxConsistency(
  transactionDate: Date,
  lineItems: { taxRateId: string }[],
  organizationId: string,
): ValidationResult {
  for (const item of lineItems) {
    if (!item.taxRateId) continue;

    const rate = findById(item.taxRateId);
    if (!rate) continue;

    const isEffective = isRateEffectiveOnDate(rate, transactionDate);
    if (!isEffective) {
      return {
        valid: false,
        errors: [{
          field: `items.taxRateId`,
          message: `Tax rate "${rate.name}" is not effective on ${formatDate(transactionDate)}. ` +
                   `This date falls under the ${getRegimeForDate(transactionDate)} regime.`,
        }],
      };
    }
  }
  return { valid: true, errors: [] };
}
```

## NestJS Module Structure

```
apps/api/src/modules/tax/
├── tax.module.ts                      # Existing - updated
├── tax.controller.ts                  # Existing - add lookup endpoint
├── tax.service.ts                     # Existing - add date-aware logic
├── tax-rate-resolver.service.ts       # NEW - date-aware rate resolution
├── tax-history-seed.service.ts        # NEW - default history seeding
├── dto/
│   ├── create-tax-rate.dto.ts         # Updated with taxRegime, effectiveFrom/To
│   ├── tax-calculate.dto.ts           # Updated with transactionDate
│   ├── tax-lookup.dto.ts              # NEW
│   └── tax-regime-summary.dto.ts      # NEW
└── tests/
    ├── tax-rate-resolver.service.spec.ts
    └── tax-history-seed.service.spec.ts
```

## Seed Data

```typescript
// apps/api/src/modules/tax/seed/malaysian-tax-history.ts

export const MALAYSIAN_TAX_HISTORY = [
  {
    name: 'GST Standard Rate',
    code: 'GST6',
    rate: 6.00,
    type: 'SST' as TaxType, // Using SST enum since there is no GST enum in TaxType
    taxRegime: 'GST' as TaxRegime,
    description: 'Goods and Services Tax (standard rate)',
    effectiveFrom: new Date('2015-04-01'),
    effectiveTo: new Date('2018-08-31'),
    isSystem: true,
    isActive: false, // Historical, no longer active
  },
  {
    name: 'GST Zero-Rated',
    code: 'GST0',
    rate: 0.00,
    type: 'ZERO_RATED' as TaxType,
    taxRegime: 'GST' as TaxRegime,
    description: 'GST zero-rated supply',
    effectiveFrom: new Date('2015-04-01'),
    effectiveTo: new Date('2018-08-31'),
    isSystem: true,
    isActive: false,
  },
  {
    name: 'GST Exempt',
    code: 'GSTEX',
    rate: 0.00,
    type: 'EXEMPT' as TaxType,
    taxRegime: 'GST' as TaxRegime,
    description: 'GST exempt supply',
    effectiveFrom: new Date('2015-04-01'),
    effectiveTo: new Date('2018-08-31'),
    isSystem: true,
    isActive: false,
  },
  {
    name: 'Tax Holiday',
    code: 'TH0',
    rate: 0.00,
    type: 'ZERO_RATED' as TaxType,
    taxRegime: 'TAX_HOLIDAY' as TaxRegime,
    description: 'Tax holiday period (0% rate)',
    effectiveFrom: new Date('2018-09-01'),
    effectiveTo: new Date('2018-12-31'),
    isSystem: true,
    isActive: false,
  },
  {
    name: 'Sales Tax 10%',
    code: 'ST10',
    rate: 10.00,
    type: 'SST' as TaxType,
    taxRegime: 'SST' as TaxRegime,
    description: 'Sales Tax (standard rate)',
    effectiveFrom: new Date('2019-01-01'),
    effectiveTo: null,
    isSystem: true,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Service Tax 6%',
    code: 'SV6',
    rate: 6.00,
    type: 'SERVICE_TAX' as TaxType,
    taxRegime: 'SST' as TaxRegime,
    description: 'Service Tax',
    effectiveFrom: new Date('2019-01-01'),
    effectiveTo: null,
    isSystem: true,
    isActive: true,
  },
  {
    name: 'SST Zero-Rated',
    code: 'ZR',
    rate: 0.00,
    type: 'ZERO_RATED' as TaxType,
    taxRegime: 'SST' as TaxRegime,
    description: 'Zero-rated supply under SST',
    effectiveFrom: new Date('2019-01-01'),
    effectiveTo: null,
    isSystem: true,
    isActive: true,
  },
  {
    name: 'SST Exempt',
    code: 'EX',
    rate: 0.00,
    type: 'EXEMPT' as TaxType,
    taxRegime: 'SST' as TaxRegime,
    description: 'Exempt from SST',
    effectiveFrom: new Date('2019-01-01'),
    effectiveTo: null,
    isSystem: true,
    isActive: true,
  },
];
```

## Dependencies
- Existing TaxRate model (schema modification)
- Existing tax calculation service (logic modification)
- Existing transaction forms (frontend modifications for date-aware tax)
- Existing report modules (regime grouping support)
