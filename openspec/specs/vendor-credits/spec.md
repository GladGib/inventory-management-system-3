# Vendor Credits

## Overview
Manage credit notes received from vendors for returns, overcharges, or adjustments.

## Requirements

### VC-001: Vendor Credits List
- **Priority**: P1
- **Description**: List page showing all vendor credits
- **Acceptance Criteria**:
  - Table with credit number, vendor, date, amount, balance, status
  - Filter by status, vendor, date range
  - Search by credit number
  - Create new credit button
  - Status badges (Open, Partially Applied, Fully Applied, Void)

### VC-002: Create Vendor Credit
- **Priority**: P1
- **Description**: Form to record vendor credit
- **Acceptance Criteria**:
  - Select vendor
  - Credit number (auto-generated or manual)
  - Credit date
  - Reference (vendor's credit note number)
  - Line items with description, amount
  - Tax handling
  - Total amount
  - Notes

### VC-003: Vendor Credit Detail
- **Priority**: P1
- **Description**: View credit details and application history
- **Acceptance Criteria**:
  - Credit header info
  - Vendor information
  - Line items
  - Applied to bills history
  - Remaining balance
  - Actions (Apply to Bill, Void)

### VC-004: Apply Credit to Bill
- **Priority**: P1
- **Description**: Apply vendor credit to outstanding bills
- **Acceptance Criteria**:
  - Select from unpaid bills for vendor
  - Enter application amount
  - Multiple bill allocation
  - Update credit balance
  - Update bill balance

### VC-005: Vendor Balance Impact
- **Priority**: P1
- **Description**: Credits affect vendor balance
- **Acceptance Criteria**:
  - Credit reduces amount owed to vendor
  - Show in vendor balance summary
  - Include in payables aging

## Database Schema

```prisma
model VendorCredit {
  id              String   @id @default(cuid())
  creditNumber    String   @unique
  vendorId        String
  vendor          Contact  @relation(fields: [vendorId], references: [id])
  creditDate      DateTime
  reference       String?  // Vendor's credit note number
  subtotal        Decimal
  taxAmount       Decimal
  total           Decimal
  balance         Decimal  // Remaining unapplied amount
  status          VendorCreditStatus @default(OPEN)
  reason          String?
  notes           String?
  items           VendorCreditItem[]
  applications    VendorCreditApplication[]
  organizationId  String
  createdById     String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([vendorId])
  @@index([organizationId])
}

model VendorCreditItem {
  id              String       @id @default(cuid())
  vendorCreditId  String
  vendorCredit    VendorCredit @relation(fields: [vendorCreditId], references: [id])
  description     String
  quantity        Decimal      @default(1)
  unitPrice       Decimal
  taxRateId       String?
  taxAmount       Decimal      @default(0)
  total           Decimal
}

model VendorCreditApplication {
  id              String       @id @default(cuid())
  vendorCreditId  String
  vendorCredit    VendorCredit @relation(fields: [vendorCreditId], references: [id])
  billId          String
  bill            Bill         @relation(fields: [billId], references: [id])
  amount          Decimal
  appliedDate     DateTime     @default(now())
  createdById     String
}

enum VendorCreditStatus {
  OPEN
  PARTIALLY_APPLIED
  FULLY_APPLIED
  VOID
}
```

## API Endpoints

```
GET    /api/purchases/credits              - List vendor credits
POST   /api/purchases/credits              - Create vendor credit
GET    /api/purchases/credits/:id          - Get credit details
PUT    /api/purchases/credits/:id          - Update credit
DELETE /api/purchases/credits/:id          - Delete credit (if unused)
POST   /api/purchases/credits/:id/apply    - Apply to bills
PUT    /api/purchases/credits/:id/void     - Void credit
GET    /api/purchases/credits/:id/applications - Get application history
```

## UI Components

### VendorCreditsPage
```tsx
// /purchases/credits
- DataTable with credits
- Filters: status, vendor, dateRange
- Actions: view, apply, void
```

### VendorCreditForm
```tsx
interface VendorCreditFormProps {
  vendorId?: string;
  credit?: VendorCredit;
  onSuccess: () => void;
}

// Form sections:
// 1. Vendor Selection
// 2. Credit Details (number, date, reference)
// 3. Line Items
// 4. Notes
```

### VendorCreditDetail Page
```tsx
// /purchases/credits/[id]
// Sections:
// - Header with status and actions
// - Vendor info card
// - Line items table
// - Totals
// - Application history
```

### ApplyCreditModal
```tsx
interface ApplyCreditModalProps {
  credit: VendorCredit;
  onApply: (applications: CreditApplication[]) => void;
  onCancel: () => void;
}

// Shows:
// - Available credit balance
// - List of unpaid bills for vendor
// - Amount to apply per bill
// - Total application amount
```

## Navigation

```
Purchases
├── Purchase Orders
├── Purchase Receives
├── Bills
├── Payments Made
└── Vendor Credits    <-- Add to menu
    ├── List
    └── [id] Detail
```

## Credit Number Generation

```typescript
// Format: VC-YYYYMM-XXXX
// Example: VC-202602-0001
function generateCreditNumber(org: Organization, date: Date): string {
  const prefix = 'VC';
  const yearMonth = format(date, 'yyyyMM');
  const sequence = await getNextSequence(org.id, 'vendor_credit', yearMonth);
  return `${prefix}-${yearMonth}-${sequence.toString().padStart(4, '0')}`;
}
```
