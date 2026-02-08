# Accounting Export (Journal Entries)

## Overview
Generate General Ledger (GL) journal entries from business transactions (invoices, payments, bills, adjustments) and export them in formats compatible with popular Malaysian accounting software (SQL Accounting, AutoCount). Includes a chart of accounts, account mapping, and trial balance reporting.

## Requirements

### ACC-001: Chart of Accounts
- **Priority**: P1
- **Description**: Manage a chart of accounts for GL mapping
- **Acceptance Criteria**:
  - Create accounts with code, name, and type (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
  - Support hierarchical parent-child account structure
  - System-seeded default accounts (Accounts Receivable, Accounts Payable, Sales Revenue, Cost of Goods Sold, Inventory Asset, SST Payable, etc.)
  - System accounts are not deletable (isSystem flag)
  - Custom accounts can be created, edited, and deleted (if no journal entries reference them)
  - Account codes must be unique within the organization
  - List all accounts grouped by type
  - Search accounts by code or name

### ACC-002: Account Mapping
- **Priority**: P1
- **Description**: Map transaction types to GL accounts
- **Acceptance Criteria**:
  - Map each transaction type to a debit and credit GL account
  - Supported transaction types:
    - SALES_INVOICE: Debit Accounts Receivable, Credit Sales Revenue
    - SALES_PAYMENT: Debit Cash/Bank, Credit Accounts Receivable
    - PURCHASE_BILL: Debit Inventory/Expense, Credit Accounts Payable
    - PURCHASE_PAYMENT: Debit Accounts Payable, Credit Cash/Bank
    - STOCK_ADJUSTMENT_INCREASE: Debit Inventory Asset, Credit Inventory Adjustment
    - STOCK_ADJUSTMENT_DECREASE: Debit Inventory Adjustment, Credit Inventory Asset
    - SALES_TAX: Debit Accounts Receivable, Credit SST Payable
    - CREDIT_NOTE: Debit Sales Returns, Credit Accounts Receivable
    - VENDOR_CREDIT: Debit Accounts Payable, Credit Purchase Returns
  - Default mapping seeded on organization setup
  - Override mapping per organization
  - Validate that both debit and credit accounts are set before journal entry generation

### ACC-003: Auto-Generate Journal Entries
- **Priority**: P1
- **Description**: Automatically create journal entries when transactions are posted
- **Acceptance Criteria**:
  - Generate journal entry when an invoice status changes to SENT or PAID
  - Generate journal entry when a payment is recorded
  - Generate journal entry when a bill status changes to RECEIVED or PAID
  - Generate journal entry when a vendor payment is recorded
  - Generate journal entry when a stock adjustment is COMPLETED
  - Generate journal entry for credit notes and vendor credits
  - Each journal entry must balance (total debits == total credits)
  - Auto-generate sequential entry number (JE-XXXXXX)
  - Journal entries are created with status DRAFT
  - User can post journal entries (status DRAFT -> POSTED)
  - Posted journal entries are immutable
  - Link journal entry back to source document via sourceType and sourceId

### ACC-004: Journal Entry Management
- **Priority**: P1
- **Description**: View and manage journal entries
- **Acceptance Criteria**:
  - List journal entries with filters (date range, status, source type)
  - View journal entry detail with all lines
  - Manual journal entry creation (for adjusting entries)
  - Post draft entries (individually or in bulk)
  - Reverse a posted entry (creates a new reversing entry)
  - Search by entry number or description
  - Pagination and sorting
  - Each journal entry line shows account code, account name, debit amount, credit amount, and description

### ACC-005: Export to Accounting Software
- **Priority**: P1
- **Description**: Export journal entries in accounting software-compatible formats
- **Acceptance Criteria**:
  - **CSV format** (SQL Accounting compatible):
    - Columns: EntryNo, Date, AccountCode, AccountName, Description, Debit, Credit, Reference
    - Date format: DD/MM/YYYY
    - Currency: MYR with 2 decimal places
    - One row per journal entry line
    - UTF-8 encoding with BOM for Excel compatibility
  - **Excel format** (AutoCount compatible):
    - Sheet 1: Journal entries with formatted headers
    - Columns: Entry Number, Date, Account Code, Account Name, Description, Debit (RM), Credit (RM), Source Document, Source Number
    - Number formatting with RM prefix
    - Summary sheet with total debits and credits
    - Date range in header
  - **Generic GL format** (JSON):
    - Full journal entry data with nested lines
    - Suitable for API integration with other systems
  - Date range filter for export
  - Status filter (DRAFT, POSTED, or all)
  - File naming: `journal-entries-{fromDate}-{toDate}.{ext}`

### ACC-006: Trial Balance Report
- **Priority**: P2
- **Description**: Generate trial balance from posted journal entries
- **Acceptance Criteria**:
  - As-of date parameter (default: today)
  - Show all accounts with debit or credit balance
  - Columns: Account Code, Account Name, Type, Debit Balance, Credit Balance
  - Total debits must equal total credits
  - Group by account type (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
  - Show subtotals per type
  - Export to Excel and PDF
  - Exclude zero-balance accounts option

## Database Schema

```prisma
model ChartOfAccount {
  id             String      @id @default(cuid())
  accountCode    String
  name           String
  type           AccountType
  parentId       String?
  description    String?
  isSystem       Boolean     @default(false)
  isActive       Boolean     @default(true)
  organizationId String
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  // Self-reference for hierarchy
  parent   ChartOfAccount?  @relation("AccountHierarchy", fields: [parentId], references: [id])
  children ChartOfAccount[] @relation("AccountHierarchy")

  // Relations
  journalEntryLines JournalEntryLine[]
  accountMappings   AccountMapping[]

  @@unique([organizationId, accountCode])
  @@index([organizationId])
  @@index([type])
  @@index([parentId])
  @@index([isActive])
}

model JournalEntry {
  id             String             @id @default(cuid())
  entryNumber    String
  date           DateTime
  description    String
  sourceType     JournalSourceType?
  sourceId       String?
  status         JournalStatus      @default(DRAFT)
  reversalOfId   String?
  organizationId String
  createdById    String?
  postedById     String?
  postedAt       DateTime?
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  // Relations
  lines     JournalEntryLine[]
  reversalOf JournalEntry?  @relation("JournalReversal", fields: [reversalOfId], references: [id])
  reversedBy JournalEntry[] @relation("JournalReversal")

  @@unique([organizationId, entryNumber])
  @@index([organizationId])
  @@index([date])
  @@index([status])
  @@index([sourceType, sourceId])
}

model JournalEntryLine {
  id             String  @id @default(cuid())
  journalEntryId String
  accountId      String
  debit          Decimal @default(0) @db.Decimal(15, 2)
  credit         Decimal @default(0) @db.Decimal(15, 2)
  description    String?

  // Relations
  journalEntry JournalEntry   @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)
  account      ChartOfAccount @relation(fields: [accountId], references: [id])

  @@index([journalEntryId])
  @@index([accountId])
}

model AccountMapping {
  id              String               @id @default(cuid())
  transactionType AccountTransactionType
  debitAccountId  String
  creditAccountId String
  organizationId  String
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  // Relations
  debitAccount  ChartOfAccount @relation(fields: [debitAccountId], references: [id])

  @@unique([organizationId, transactionType])
  @@index([organizationId])
}

enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  REVENUE
  EXPENSE
}

enum JournalSourceType {
  INVOICE
  PAYMENT
  BILL
  VENDOR_PAYMENT
  ADJUSTMENT
  CREDIT_NOTE
  VENDOR_CREDIT
  MANUAL
}

enum JournalStatus {
  DRAFT
  POSTED
  REVERSED
}

enum AccountTransactionType {
  SALES_INVOICE
  SALES_PAYMENT
  PURCHASE_BILL
  PURCHASE_PAYMENT
  STOCK_ADJUSTMENT_INCREASE
  STOCK_ADJUSTMENT_DECREASE
  SALES_TAX
  CREDIT_NOTE
  VENDOR_CREDIT
}
```

## API Endpoints

```
# Chart of Accounts
GET    /api/accounting/chart-of-accounts               - List all accounts (grouped by type)
POST   /api/accounting/chart-of-accounts               - Create account
GET    /api/accounting/chart-of-accounts/:id            - Get account details
PUT    /api/accounting/chart-of-accounts/:id            - Update account
DELETE /api/accounting/chart-of-accounts/:id            - Delete account (if not system and no entries)

# Account Mapping
GET    /api/accounting/account-mappings                 - List all mappings
PUT    /api/accounting/account-mappings                 - Update mappings (batch update)

# Journal Entries
GET    /api/accounting/journal-entries                  - List journal entries (with filters)
POST   /api/accounting/journal-entries                  - Create manual journal entry
GET    /api/accounting/journal-entries/:id              - Get journal entry with lines
PUT    /api/accounting/journal-entries/:id/post         - Post a draft entry
PUT    /api/accounting/journal-entries/:id/reverse      - Reverse a posted entry
POST   /api/accounting/journal-entries/bulk-post        - Bulk post draft entries

# Export
POST   /api/accounting/export                           - Export journal entries
GET    /api/accounting/trial-balance                    - Trial balance report
```

### Request/Response Schemas

```typescript
// POST /api/accounting/chart-of-accounts
interface CreateAccountRequest {
  accountCode: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  parentId?: string;
  description?: string;
}

// POST /api/accounting/journal-entries (manual entry)
interface CreateJournalEntryRequest {
  date: string;          // ISO date
  description: string;
  lines: {
    accountId: string;
    debit: number;       // Only one of debit/credit should be > 0
    credit: number;
    description?: string;
  }[];
}
// Validation: SUM(debit) must equal SUM(credit)

// PUT /api/accounting/account-mappings
interface UpdateAccountMappingsRequest {
  mappings: {
    transactionType: AccountTransactionType;
    debitAccountId: string;
    creditAccountId: string;
  }[];
}

// POST /api/accounting/export
interface ExportJournalEntriesRequest {
  format: 'csv' | 'xlsx' | 'json';
  dateFrom: string;      // ISO date
  dateTo: string;        // ISO date
  status?: 'DRAFT' | 'POSTED'; // Default: 'POSTED'
}

// GET /api/accounting/trial-balance
interface TrialBalanceQuery {
  asOfDate?: string;     // ISO date, default: today
  excludeZeroBalance?: boolean; // Default: false
  format?: 'json' | 'xlsx' | 'pdf';
}

interface TrialBalanceResponse {
  asOfDate: string;
  accounts: {
    accountCode: string;
    accountName: string;
    type: AccountType;
    debitBalance: number;
    creditBalance: number;
  }[];
  subtotals: {
    type: AccountType;
    debitTotal: number;
    creditTotal: number;
  }[];
  totals: {
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
  };
}

// GET /api/accounting/journal-entries
interface ListJournalEntriesQuery {
  fromDate?: string;
  toDate?: string;
  status?: 'DRAFT' | 'POSTED' | 'REVERSED';
  sourceType?: JournalSourceType;
  search?: string;       // Search entry number or description
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'entryNumber' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
```

## Frontend Pages

### Page Structure

```
apps/web/app/(dashboard)/settings/accounting/
├── page.tsx                       # Chart of accounts + account mapping tabs
├── components/
│   ├── ChartOfAccountsTable.tsx   # Tree table of accounts
│   ├── AccountFormModal.tsx       # Create/edit account
│   ├── AccountMappingTable.tsx    # Transaction type to account mapping
│   └── DefaultAccountsInfo.tsx    # Info about system-seeded accounts

apps/web/app/(dashboard)/reports/journal-entries/
├── page.tsx                       # Journal entries list with filters and export
├── [id]/
│   └── page.tsx                   # Journal entry detail view
├── new/
│   └── page.tsx                   # Manual journal entry creation form
├── components/
│   ├── JournalEntryTable.tsx      # List with status badges
│   ├── JournalEntryDetail.tsx     # Debit/credit lines display
│   ├── JournalEntryForm.tsx       # Manual entry form with balanced validation
│   └── ExportModal.tsx            # Export format selection and date range

apps/web/app/(dashboard)/reports/trial-balance/
├── page.tsx                       # Trial balance report with as-of date
└── components/
    └── TrialBalanceTable.tsx       # Grouped by account type with subtotals
```

### /settings/accounting Page

```tsx
// Two tabs: Chart of Accounts | Account Mapping

// Tab 1: Chart of Accounts
// - Tree table with columns: Code, Name, Type, System, Status, Actions
// - Expandable rows for parent-child hierarchy
// - Add Account button
// - Type filter pills: All, Asset, Liability, Equity, Revenue, Expense
// - Actions: Edit, Delete (disabled for system accounts)
// - Tag badges for account type with colors:
//   - ASSET: blue
//   - LIABILITY: red
//   - EQUITY: purple
//   - REVENUE: green
//   - EXPENSE: orange

// Tab 2: Account Mapping
// - Table with columns: Transaction Type, Debit Account, Credit Account, Actions
// - Each row has Select dropdowns for debit and credit accounts
// - Save All Mappings button
// - Reset to Defaults button
// - Validation indicator: green check if both accounts set, yellow warning if incomplete
```

### /reports/journal-entries Page

```tsx
// - Date range picker with presets (This Month, Last Month, This Quarter, This Year)
// - Status filter: All, Draft, Posted, Reversed
// - Source type filter dropdown
// - Search by entry number
// - Export button (opens ExportModal)
// - Bulk Post button (for selected draft entries)
// - Table columns: Entry Number, Date, Description, Source, Status, Total Amount, Actions
// - Status badges: Draft (gray), Posted (green), Reversed (red)
// - Actions: View, Post (if draft), Reverse (if posted)
// - Click row to navigate to detail page

// Create Manual Entry button -> /reports/journal-entries/new
```

### /reports/trial-balance Page

```tsx
// - As-of date picker
// - Exclude zero-balance toggle
// - Export dropdown (Excel, PDF)
// - Table grouped by account type with subtotals
// - Columns: Account Code, Account Name, Debit Balance (RM), Credit Balance (RM)
// - Type section headers with subtotal rows
// - Grand total row at bottom with balance indicator (green if balanced, red if not)
```

## Hooks

```typescript
// apps/web/hooks/use-accounting.ts

export function useChartOfAccounts(filters?: { type?: AccountType; search?: string });
export function useCreateAccount();
export function useUpdateAccount();
export function useDeleteAccount();

export function useAccountMappings();
export function useUpdateAccountMappings();

export function useJournalEntries(filters: ListJournalEntriesQuery);
export function useJournalEntry(id: string);
export function useCreateJournalEntry();
export function usePostJournalEntry();
export function useReverseJournalEntry();
export function useBulkPostJournalEntries();

export function useExportJournalEntries();
export function useTrialBalance(asOfDate?: string, excludeZero?: boolean);
```

## Business Logic

### Journal Entry Auto-Generation

```typescript
// When an invoice is marked SENT:
// JE lines:
//   DR Accounts Receivable    {invoice.total}
//   CR Sales Revenue           {invoice.subtotal}
//   CR SST Payable             {invoice.taxAmount}    (if taxAmount > 0)

// When a sales payment is recorded:
// JE lines:
//   DR Cash/Bank               {payment.amount}
//   CR Accounts Receivable     {payment.amount}

// When a bill is marked RECEIVED:
// JE lines:
//   DR Inventory Asset / Expense  {bill.subtotal}
//   DR SST Input Tax              {bill.taxAmount}   (if taxAmount > 0)
//   CR Accounts Payable           {bill.total}

// When a vendor payment is recorded:
// JE lines:
//   DR Accounts Payable        {payment.amount}
//   CR Cash/Bank               {payment.amount}

// When a stock adjustment (increase) is completed:
// JE lines:
//   DR Inventory Asset         {adjustmentValue}
//   CR Inventory Adjustment    {adjustmentValue}

// When a stock adjustment (decrease) is completed:
// JE lines:
//   DR Inventory Adjustment    {adjustmentValue}
//   CR Inventory Asset         {adjustmentValue}

// When a credit note is issued:
// JE lines:
//   DR Sales Returns           {creditNote.total}
//   CR Accounts Receivable     {creditNote.total}
```

### Default Chart of Accounts Seed

```typescript
const DEFAULT_ACCOUNTS = [
  // Assets
  { code: '1000', name: 'Cash', type: 'ASSET', isSystem: true },
  { code: '1010', name: 'Bank Account', type: 'ASSET', isSystem: true },
  { code: '1100', name: 'Accounts Receivable', type: 'ASSET', isSystem: true },
  { code: '1200', name: 'Inventory Asset', type: 'ASSET', isSystem: true },
  { code: '1210', name: 'Inventory Adjustment', type: 'ASSET', isSystem: true },
  { code: '1300', name: 'SST Input Tax', type: 'ASSET', isSystem: true },

  // Liabilities
  { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', isSystem: true },
  { code: '2100', name: 'SST Payable', type: 'LIABILITY', isSystem: true },

  // Equity
  { code: '3000', name: 'Owner Equity', type: 'EQUITY', isSystem: true },
  { code: '3100', name: 'Retained Earnings', type: 'EQUITY', isSystem: true },

  // Revenue
  { code: '4000', name: 'Sales Revenue', type: 'REVENUE', isSystem: true },
  { code: '4100', name: 'Sales Returns', type: 'REVENUE', isSystem: true },
  { code: '4200', name: 'Sales Discount', type: 'REVENUE', isSystem: true },

  // Expenses
  { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', isSystem: true },
  { code: '5100', name: 'Purchase Returns', type: 'EXPENSE', isSystem: true },
  { code: '5200', name: 'Purchase Discount', type: 'EXPENSE', isSystem: true },
  { code: '6000', name: 'General Expense', type: 'EXPENSE', isSystem: true },
];
```

### CSV Export Format (SQL Accounting)

```
EntryNo,Date,AccountCode,AccountName,Description,Debit,Credit,Reference
JE-000001,15/01/2025,1100,Accounts Receivable,Invoice INV-000123,1060.00,0.00,INV-000123
JE-000001,15/01/2025,4000,Sales Revenue,Invoice INV-000123,0.00,1000.00,INV-000123
JE-000001,15/01/2025,2100,SST Payable,Invoice INV-000123 - SST,0.00,60.00,INV-000123
```

### Excel Export Format (AutoCount)

```
Sheet: Journal Entries
| Entry Number | Date       | Account Code | Account Name         | Description           | Debit (RM)  | Credit (RM) | Source    | Source Number |
|-------------|------------|--------------|---------------------|-----------------------|-------------|-------------|-----------|---------------|
| JE-000001   | 15/01/2025 | 1100         | Accounts Receivable | Invoice INV-000123    | RM 1,060.00 |             | INVOICE   | INV-000123    |
| JE-000001   | 15/01/2025 | 4000         | Sales Revenue       | Invoice INV-000123    |             | RM 1,000.00 | INVOICE   | INV-000123    |
| JE-000001   | 15/01/2025 | 2100         | SST Payable         | Invoice INV-000123    |             | RM 60.00    | INVOICE   | INV-000123    |

Sheet: Summary
| Period: 01/01/2025 - 31/01/2025 |
| Total Entries: 45               |
| Total Debit: RM 125,000.00      |
| Total Credit: RM 125,000.00     |
| Status: Balanced                |
```

## NestJS Module Structure

```
apps/api/src/modules/accounting/
├── accounting.module.ts
├── chart-of-accounts.controller.ts
├── chart-of-accounts.service.ts
├── account-mapping.controller.ts
├── account-mapping.service.ts
├── journal-entries.controller.ts
├── journal-entries.service.ts
├── journal-auto-generator.service.ts  # Listens to transaction events
├── export.controller.ts
├── export.service.ts                  # CSV, Excel, JSON export
├── trial-balance.service.ts
├── dto/
│   ├── create-account.dto.ts
│   ├── update-account.dto.ts
│   ├── create-journal-entry.dto.ts
│   ├── update-account-mappings.dto.ts
│   ├── export-journal-entries.dto.ts
│   └── trial-balance-query.dto.ts
├── seed/
│   └── default-accounts.seed.ts       # Default chart of accounts
└── tests/
    ├── journal-entries.service.spec.ts
    ├── journal-auto-generator.service.spec.ts
    ├── export.service.spec.ts
    └── trial-balance.service.spec.ts
```

## Event Integration

```typescript
// The journal auto-generator listens to existing transaction events:
// - 'invoice.sent'          -> Generate sales invoice journal entry
// - 'payment.recorded'      -> Generate sales payment journal entry
// - 'bill.received'         -> Generate purchase bill journal entry
// - 'vendorPayment.recorded'-> Generate purchase payment journal entry
// - 'adjustment.completed'  -> Generate adjustment journal entry
// - 'creditNote.created'    -> Generate credit note journal entry
// - 'vendorCredit.created'  -> Generate vendor credit journal entry
```

## Dependencies
- ExcelJS for Excel export (existing dependency)
- Existing PDF service for trial balance PDF export
- Existing Invoice, Payment, Bill, VendorPayment, StockAdjustment, CreditNote, VendorCredit modules (event sources)
