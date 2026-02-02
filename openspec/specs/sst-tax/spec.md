# SST Tax System (Malaysian Sales & Service Tax)

## Overview
Malaysian Sales Tax (10%) and Service Tax (6%) compliance for inventory management.

## Requirements

### TAX-001: Tax Rate Configuration
- **Priority**: P0
- **Description**: Configure SST tax rates
- **Acceptance Criteria**:
  - Create multiple tax rates
  - Types: Sales Tax (10%), Service Tax (6%), Zero-rated, Exempt
  - Set default tax rate
  - Effective date tracking
  - Tax code/name for reporting

### TAX-002: Tax Calculation Engine
- **Priority**: P0
- **Description**: Calculate taxes on transactions
- **Acceptance Criteria**:
  - Line-level tax calculation
  - Multiple tax rates per transaction
  - Tax-inclusive and tax-exclusive pricing
  - Rounding rules per Malaysian requirements
  - Compound tax support

### TAX-003: Item Tax Assignment
- **Priority**: P0
- **Description**: Assign tax rates to items
- **Acceptance Criteria**:
  - Default tax rate per item
  - Override tax at transaction level
  - Tax-exempt items
  - Zero-rated items (exports)

### TAX-004: Contact Tax Settings
- **Priority**: P0
- **Description**: Tax settings for customers/vendors
- **Acceptance Criteria**:
  - Record SST registration number
  - Tax-exempt customer flag
  - Default tax treatment
  - Foreign customer handling

### TAX-005: SST Registration
- **Priority**: P0
- **Description**: Organization SST registration
- **Acceptance Criteria**:
  - SST registration number
  - Registration effective date
  - Display on invoices/documents
  - Threshold tracking

### TAX-006: Tax Reports
- **Priority**: P1
- **Description**: Generate SST reports
- **Acceptance Criteria**:
  - SST-02 return data
  - Sales by tax rate
  - Purchases by tax rate
  - Tax collected vs paid summary

## API Endpoints

```
GET    /api/settings/tax-rates         - List tax rates
POST   /api/settings/tax-rates         - Create tax rate
PUT    /api/settings/tax-rates/:id     - Update tax rate
DELETE /api/settings/tax-rates/:id     - Delete tax rate
GET    /api/reports/tax/sst-summary    - SST summary report
GET    /api/reports/tax/sst-02         - SST-02 return data
POST   /api/tax/calculate              - Calculate tax for items
```

## Database Schema

```prisma
model TaxRate {
  id              String    @id @default(cuid())
  name            String    // "Sales Tax 10%", "Service Tax 6%"
  code            String    // "ST10", "ST6", "ZR", "EX"
  rate            Decimal   // 10, 6, 0
  type            TaxType
  description     String?
  isDefault       Boolean   @default(false)
  isActive        Boolean   @default(true)
  effectiveFrom   DateTime?
  effectiveTo     DateTime?
  organizationId  String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  items           Item[]
  invoiceItems    InvoiceItem[]
  billItems       BillItem[]
}

model OrganizationTaxSettings {
  id                  String   @id @default(cuid())
  organizationId      String   @unique
  organization        Organization @relation(fields: [organizationId], references: [id])
  sstRegistrationNo   String?
  sstRegisteredDate   DateTime?
  sstThreshold        Decimal? // RM 500,000
  isSstRegistered     Boolean  @default(false)
  defaultSalesTaxId   String?
  defaultPurchaseTaxId String?
  taxInclusive        Boolean  @default(false) // Default pricing mode
  roundingMethod      RoundingMethod @default(NORMAL)
}

enum TaxType {
  SALES_TAX      // 10%
  SERVICE_TAX    // 6%
  ZERO_RATED     // 0% but reclaimable
  EXEMPT         // Not subject to tax
  OUT_OF_SCOPE   // Outside SST scope
}

enum RoundingMethod {
  NORMAL         // Standard rounding
  ROUND_DOWN     // Always round down
  ROUND_UP       // Always round up
}
```

## Tax Calculation Logic

```typescript
interface TaxCalculation {
  subtotal: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
  breakdown: TaxBreakdown[];
}

interface TaxBreakdown {
  taxRateId: string;
  taxName: string;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
}

// Tax-exclusive: total = subtotal + tax
// Tax-inclusive: subtotal = total / (1 + rate), tax = total - subtotal
```
