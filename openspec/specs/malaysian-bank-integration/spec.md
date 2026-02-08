# Malaysian Bank Integration

## Overview
Bank account management and reconciliation system for Malaysian banks. Supports importing bank statements from major Malaysian banks (Maybank, CIMB, Public Bank, RHB, Hong Leong, AmBank) in CSV/OFX format, and provides tools to match bank transactions against payments and receipts for reconciliation.

## Requirements

### MB-001: Bank Account Model
- **Priority**: P1
- **Description**: Store and manage organization bank accounts
- **Acceptance Criteria**:
  - Create `BankAccount` model for tracking organization bank accounts
  - Support major Malaysian banks: Maybank, CIMB, Public Bank, RHB, Hong Leong, AmBank, and OTHER
  - Store: bank name, account number, account name, currency (default MYR), branch
  - One bank account can be set as default per organization
  - Link bank accounts to payment records
  - Status: ACTIVE / INACTIVE
  - Bank accounts are organization-scoped

### MB-002: Bank Transaction Model
- **Priority**: P1
- **Description**: Store imported bank transactions for reconciliation
- **Acceptance Criteria**:
  - Create `BankTransaction` model for individual statement lines
  - Fields: transaction date, description, reference, debit amount, credit amount, running balance
  - Reconciliation status: UNMATCHED, MATCHED, EXCLUDED
  - Link matched transactions to `Payment` or `VendorPayment` records
  - Store import batch ID to group transactions from the same import
  - Prevent duplicate imports (check by date + reference + amount)

### MB-003: Bank Account Settings Page
- **Priority**: P1
- **Description**: Manage bank accounts in organization settings
- **Acceptance Criteria**:
  - Settings page at `/settings/bank-accounts`
  - List existing bank accounts in a table: bank name (with logo), account number (masked: ****1234), account name, currency, default status, active status
  - "Add Bank Account" button opens modal/drawer form
  - Form fields: bank name (dropdown with Malaysian banks), account number, account name, branch (optional), currency (default MYR)
  - Edit bank account
  - Set as default bank account (toggle)
  - Deactivate bank account (soft delete)
  - Cannot delete bank account that has linked transactions

### MB-004: Bank Statement Import
- **Priority**: P1
- **Description**: Import bank statements in CSV or OFX format
- **Acceptance Criteria**:
  - `POST /api/banking/import` accepts file upload (CSV or OFX)
  - Select bank account for the import
  - Detect file format (CSV vs OFX) and apply appropriate parser
  - CSV parsers for each bank format:
    - Maybank: Date, Description, Debit (DR), Credit (CR), Balance
    - CIMB: Transaction Date, Description, Debit, Credit, Balance
    - Public Bank: Date, Description, Cheque No, Debit, Credit, Balance
    - RHB, Hong Leong, AmBank: similar columnar formats
  - OFX parser: standard OFX/QFX financial data format
  - Duplicate detection: skip transactions that already exist (same date + reference + amount)
  - Return import summary: total rows, imported, duplicates skipped, errors
  - Store all imported transactions as `BankTransaction` records with `isReconciled = false`

### MB-005: Bank Statement Import Page
- **Priority**: P1
- **Description**: Frontend page for importing bank statements
- **Acceptance Criteria**:
  - Accessible from bank reconciliation page or settings
  - Step 1: Select bank account from dropdown
  - Step 2: Upload file (drag and drop or file picker)
  - Step 3: Preview imported transactions in a table
  - Step 4: Confirm import
  - Show import results: success count, duplicates skipped, errors
  - File size limit: 5MB
  - Accepted formats: .csv, .ofx, .qfx

### MB-006: Bank Reconciliation Page
- **Priority**: P1
- **Description**: Reconcile bank transactions against system payments
- **Acceptance Criteria**:
  - Page at `/reports/bank-reconciliation`
  - Select bank account and date range
  - Two-panel layout:
    - Left panel: Unmatched bank transactions (from imported statements)
    - Right panel: Unmatched system payments/receipts
  - Auto-match button: system attempts to match by:
    1. Exact amount + reference number match
    2. Exact amount + date match (within +/- 2 days tolerance)
    3. Fuzzy description match + amount match
  - Manual match: select one bank transaction and one payment, click "Match"
  - Unmatch: undo a previous match
  - Exclude: mark a bank transaction as excluded (bank fees, interest, etc.)
  - Reconciliation summary at top:
    - Bank statement balance
    - System balance (total payments - total refunds)
    - Difference (should be zero when fully reconciled)
    - Matched count / Unmatched count

### MB-007: Auto-Matching Logic
- **Priority**: P1
- **Description**: Automatically match bank transactions to system payments
- **Acceptance Criteria**:
  - `POST /api/banking/reconciliation/auto-match`
  - Input: `{ bankAccountId, dateFrom, dateTo }`
  - Matching algorithm (in priority order):
    1. **Exact Match**: bank reference equals payment reference AND amount matches
    2. **Amount + Date Match**: amount matches AND transaction date within +/- 2 days of payment date
    3. **Fuzzy Match**: amount matches AND description contains payment number or customer/vendor name
  - Only match credit transactions to customer payments (incoming)
  - Only match debit transactions to vendor payments (outgoing)
  - Return: matched count, suggestions (partial matches for manual review)
  - Suggestions include confidence score (HIGH, MEDIUM, LOW)

### MB-008: Manual Transaction Matching
- **Priority**: P1
- **Description**: Manually match a bank transaction to a system payment
- **Acceptance Criteria**:
  - `POST /api/banking/reconciliation/match`
  - Input: `{ bankTransactionId, paymentId?, vendorPaymentId?, notes? }`
  - Validates: amounts should match (or close with explanation)
  - Updates `BankTransaction.isReconciled = true` and `matchedPaymentId`
  - If amounts differ: require notes explaining the difference
  - One bank transaction maps to one payment (1:1)

### MB-009: Unmatching and Excluding
- **Priority**: P1
- **Description**: Unmatch or exclude bank transactions
- **Acceptance Criteria**:
  - `POST /api/banking/reconciliation/unmatch` reverses a match
  - `POST /api/banking/reconciliation/exclude` marks a transaction as excluded
  - Excluded transactions have `status = EXCLUDED` and a reason field
  - Common exclusion reasons: bank fee, interest earned, bank charge, duplicate
  - Excluded transactions do not appear in unmatched list
  - Can un-exclude a previously excluded transaction

### MB-010: Reconciliation Report
- **Priority**: P1
- **Description**: Generate bank reconciliation report
- **Acceptance Criteria**:
  - `GET /api/banking/reconciliation`
  - Query params: `bankAccountId`, `dateFrom`, `dateTo`
  - Response includes:
    - Bank statement summary: opening balance, total debits, total credits, closing balance
    - System summary: total payments received, total payments made
    - Matched transactions list
    - Unmatched bank transactions list
    - Unmatched system payments list
    - Reconciliation difference
  - Export to Excel/CSV
  - Print-friendly view

### MB-011: Bank Transaction List
- **Priority**: P1
- **Description**: View all imported bank transactions
- **Acceptance Criteria**:
  - `GET /api/banking/transactions`
  - Filter by: bank account, date range, reconciliation status, type (debit/credit)
  - Search by description or reference
  - Sort by date, amount
  - Pagination
  - Show matched payment reference when reconciled

## Data Models

### BankAccount (New Model)

```prisma
model BankAccount {
  id             String        @id @default(cuid())
  bankName       BankName
  accountNumber  String
  accountName    String
  branch         String?
  currency       String        @default("MYR")
  isDefault      Boolean       @default(false)
  status         Status        @default(ACTIVE)
  organizationId String
  organization   Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  transactions   BankTransaction[]

  @@unique([organizationId, bankName, accountNumber])
  @@index([organizationId])
  @@index([status])
}

enum BankName {
  MAYBANK
  CIMB
  PUBLIC_BANK
  RHB
  HONG_LEONG
  AMBANK
  BANK_ISLAM
  BANK_RAKYAT
  BSN
  OCBC
  HSBC
  UOB
  STANDARD_CHARTERED
  OTHER
}
```

### BankTransaction (New Model)

```prisma
model BankTransaction {
  id                 String                    @id @default(cuid())
  bankAccountId      String
  bankAccount        BankAccount               @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)
  transactionDate    DateTime
  valueDate          DateTime?
  description        String
  reference          String?
  chequeNumber       String?
  debit              Decimal?                  @db.Decimal(15, 2)
  credit             Decimal?                  @db.Decimal(15, 2)
  balance            Decimal?                  @db.Decimal(15, 2)
  status             BankTransactionStatus     @default(UNMATCHED)
  matchedPaymentId   String?
  matchedVendorPaymentId String?
  excludeReason      String?
  importBatchId      String?
  notes              String?
  organizationId     String
  createdAt          DateTime                  @default(now())
  updatedAt          DateTime                  @updatedAt

  @@index([bankAccountId])
  @@index([organizationId])
  @@index([transactionDate])
  @@index([status])
  @@index([importBatchId])
  @@index([matchedPaymentId])
  @@index([matchedVendorPaymentId])
}

model BankStatementImport {
  id             String   @id @default(cuid())
  bankAccountId  String
  fileName       String
  fileFormat     String   // 'csv' | 'ofx' | 'qfx'
  totalRows      Int
  importedRows   Int
  duplicateRows  Int
  errorRows      Int
  dateFrom       DateTime?
  dateTo         DateTime?
  importedById   String?
  organizationId String
  createdAt      DateTime @default(now())

  @@index([bankAccountId])
  @@index([organizationId])
}

enum BankTransactionStatus {
  UNMATCHED
  MATCHED
  EXCLUDED
}
```

### Schema Changes

Add to `Organization` model:
```prisma
bankAccounts        BankAccount[]
bankTransactions    BankTransaction[]
bankStatementImports BankStatementImport[]
```

## API Endpoints

### Bank Account Management

```
POST   /api/banking/accounts                             - Create bank account
  Body: { bankName, accountNumber, accountName, branch?, currency?, isDefault? }
  Response: BankAccount

GET    /api/banking/accounts                             - List bank accounts
  Response: BankAccount[]

GET    /api/banking/accounts/:id                         - Get bank account
  Response: BankAccount

PUT    /api/banking/accounts/:id                         - Update bank account
  Body: { accountName?, branch?, isDefault?, status? }
  Response: BankAccount

DELETE /api/banking/accounts/:id                         - Delete bank account (if no transactions)
  Response: { success: true }
```

### Bank Statement Import

```
POST   /api/banking/import                               - Import bank statement
  Body: multipart/form-data { file, bankAccountId, bankFormat?: string }
  Response: {
    importBatchId: string,
    totalRows: number,
    imported: number,
    duplicates: number,
    errors: number,
    transactions: BankTransaction[]  // Preview of imported transactions
  }

GET    /api/banking/imports                              - List import history
  Query: { bankAccountId?, page?, limit? }
  Response: PaginatedResponse<BankStatementImport>
```

### Bank Transactions

```
GET    /api/banking/transactions                         - List bank transactions
  Query: { bankAccountId?, dateFrom?, dateTo?, status?, type?, search?, page?, limit? }
  Response: PaginatedResponse<BankTransaction>

GET    /api/banking/transactions/:id                     - Get transaction detail
  Response: BankTransaction
```

### Reconciliation

```
GET    /api/banking/reconciliation                       - Get reconciliation data
  Query: { bankAccountId, dateFrom, dateTo }
  Response: {
    summary: {
      bankOpeningBalance: number,
      bankTotalDebits: number,
      bankTotalCredits: number,
      bankClosingBalance: number,
      systemPaymentsReceived: number,
      systemPaymentsMade: number,
      matchedCount: number,
      unmatchedBankCount: number,
      unmatchedSystemCount: number,
      difference: number
    },
    unmatchedBankTransactions: BankTransaction[],
    unmatchedSystemPayments: (Payment | VendorPayment)[],
    matchedTransactions: { bankTransaction: BankTransaction, payment: Payment | VendorPayment }[]
  }

POST   /api/banking/reconciliation/auto-match            - Auto-match transactions
  Body: { bankAccountId, dateFrom, dateTo }
  Response: {
    matched: number,
    suggestions: {
      bankTransaction: BankTransaction,
      suggestedPayment: Payment | VendorPayment,
      confidence: 'HIGH' | 'MEDIUM' | 'LOW',
      matchReason: string
    }[]
  }

POST   /api/banking/reconciliation/match                 - Manual match
  Body: { bankTransactionId, paymentId?, vendorPaymentId?, notes? }
  Response: { success: true, bankTransaction: BankTransaction }

POST   /api/banking/reconciliation/unmatch               - Unmatch a transaction
  Body: { bankTransactionId }
  Response: { success: true }

POST   /api/banking/reconciliation/exclude               - Exclude a transaction
  Body: { bankTransactionId, reason: string }
  Response: { success: true }

POST   /api/banking/reconciliation/unexclude             - Un-exclude a transaction
  Body: { bankTransactionId }
  Response: { success: true }

GET    /api/banking/reconciliation/export                - Export reconciliation report
  Query: { bankAccountId, dateFrom, dateTo, format: 'xlsx' | 'csv' }
  Response: File download
```

## Frontend Pages & Components

### Bank Accounts Settings Page

```tsx
// apps/web/src/app/(dashboard)/settings/bank-accounts/page.tsx

// Components:
// - Ant Design: Table, Button, Modal, Form, Input, Select, Switch, Tag, Space, Popconfirm
// - Page header: "Bank Accounts" with "Add Bank Account" button
// - Table columns:
//   - Bank (logo + name)
//   - Account Number (masked: ****1234)
//   - Account Name
//   - Branch
//   - Currency
//   - Default (star icon for default)
//   - Status (Active/Inactive tag)
//   - Actions (Edit, Set Default, Deactivate)
// - Add/Edit modal:
//   - Bank name dropdown with bank logos: Maybank, CIMB, Public Bank, RHB, Hong Leong, AmBank, Other
//   - Account number input (numeric validation)
//   - Account name input
//   - Branch input (optional)
//   - Currency select (default MYR)
//   - Set as default checkbox
```

### Bank Reconciliation Page

```tsx
// apps/web/src/app/(dashboard)/reports/bank-reconciliation/page.tsx

// Components:
// - Ant Design: Select, DatePicker.RangePicker, Button, Card, Statistic, Table, Tag, Space, Row, Col, Divider, Modal, Tabs, Upload, message

// Layout:
// - Filter bar: Bank account select, Date range picker, "Load" button
// - Summary cards row:
//   - Bank Closing Balance (from statement)
//   - System Balance (calculated)
//   - Difference (highlighted red if non-zero, green if zero)
//   - Matched / Unmatched counts
// - Action buttons: "Auto-Match", "Import Statement", "Export Report"

// Two-panel layout (using Ant Design Tabs or side-by-side):
// - Tab 1: "Unmatched Bank Transactions"
//   - Table: Date, Description, Reference, Debit, Credit, Balance
//   - Row selection (checkbox)
//   - "Match" button (enabled when 1 bank txn selected)
//   - "Exclude" button with reason popover
// - Tab 2: "Unmatched System Payments"
//   - Table: Date, Payment #, Customer/Vendor, Amount, Method, Reference
//   - Row selection (checkbox)
// - Tab 3: "Matched Transactions"
//   - Table: Date, Bank Description, Amount, Matched To (payment link), Matched By
//   - "Unmatch" button per row

// Match flow:
// 1. Select one bank transaction from left panel
// 2. Select one system payment from right panel
// 3. Click "Match" button
// 4. Confirmation modal shows both records side by side
// 5. If amounts differ: show difference and require notes
// 6. Confirm match

// Auto-match flow:
// 1. Click "Auto-Match"
// 2. Loading overlay while processing
// 3. Show results: X matched, Y suggestions
// 4. Suggestions displayed with confidence badges (HIGH=green, MEDIUM=yellow, LOW=red)
// 5. Accept or reject each suggestion
```

### Statement Import Modal

```tsx
// apps/web/src/components/banking/StatementImportModal.tsx

interface StatementImportModalProps {
  visible: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  bankAccountId?: string;
}

// Components:
// - Ant Design: Modal, Steps, Upload, Select, Table, Alert, Button, Result
// - Step 1: Select bank account (if not pre-selected)
// - Step 2: Upload file
//   - Ant Design Upload.Dragger for drag-and-drop
//   - Accept: .csv, .ofx, .qfx
//   - Max size: 5MB
//   - Auto-detect format based on extension
// - Step 3: Preview
//   - Table showing first 20 rows of parsed transactions
//   - Column mapping verification
//   - Duplicate detection summary
// - Step 4: Confirm and import
// - Step 5: Result
//   - Success count, duplicates, errors
//   - "View Transactions" button
```

### Bank Logo Component

```tsx
// apps/web/src/components/banking/BankLogo.tsx

interface BankLogoProps {
  bankName: BankName;
  size?: 'small' | 'medium' | 'large';
}

// Renders bank logo SVG/PNG based on bank name
// Logos stored in: apps/web/public/images/banks/
// Files: maybank.svg, cimb.svg, public-bank.svg, rhb.svg, hong-leong.svg, ambank.svg
// Fallback: generic bank icon for OTHER
```

## Business Logic

### CSV Parser Architecture

```typescript
// apps/api/src/modules/banking/parsers/base.parser.ts

interface BankStatementParser {
  parse(content: string): ParsedTransaction[];
  detectFormat(content: string): boolean;
}

interface ParsedTransaction {
  transactionDate: Date;
  valueDate?: Date;
  description: string;
  reference?: string;
  chequeNumber?: string;
  debit?: number;
  credit?: number;
  balance?: number;
}

// apps/api/src/modules/banking/parsers/maybank.parser.ts
// Maybank CSV format:
// "Transaction Date","Description","Debit (DR)","Credit (CR)","Balance"
// "01/01/2025","PAYMENT FROM ABC SDN BHD","","5,000.00","15,000.00"
// Note: Maybank uses DD/MM/YYYY format, amounts with comma thousands separator

// apps/api/src/modules/banking/parsers/cimb.parser.ts
// CIMB CSV format:
// Transaction Date,Description,Debit,Credit,Balance
// 2025-01-01,TRF FROM XYZ ENTERPRISE,,3000.00,18000.00
// Note: CIMB uses YYYY-MM-DD format

// apps/api/src/modules/banking/parsers/public-bank.parser.ts
// Public Bank CSV format:
// Date,Description,Cheque No,Debit,Credit,Balance
// 01-Jan-2025,INSTANT TRANSFER FROM CUSTOMER,,2500.00,,20500.00
// Note: Public Bank uses DD-Mon-YYYY format, has cheque number column

// apps/api/src/modules/banking/parsers/ofx.parser.ts
// Standard OFX format parsing
// Uses XML-like structure with STMTTRN elements
// Fields: DTPOSTED, TRNAMT, FITID, NAME, MEMO
```

### Duplicate Detection

```typescript
// Check for duplicates during import:
// Match on: bankAccountId + transactionDate + amount (debit or credit) + reference
// If all four match an existing record, skip as duplicate
// If date + amount match but reference differs, flag as potential duplicate for review
```

### Auto-Match Algorithm

```typescript
// apps/api/src/modules/banking/reconciliation.service.ts

// Step 1: Exact reference match
// For each unmatched bank credit transaction:
//   Find Payment where referenceNumber === bankTransaction.reference AND amount matches
// For each unmatched bank debit transaction:
//   Find VendorPayment where referenceNumber === bankTransaction.reference AND amount matches

// Step 2: Amount + date proximity match
// For remaining unmatched:
//   Find payments with exact amount AND paymentDate within +/- 2 days of transactionDate
//   Only match if there's exactly one candidate (avoid ambiguous matches)

// Step 3: Fuzzy description match
// For remaining unmatched:
//   Check if bank description contains paymentNumber, customerName, or vendorName
//   Combined with exact amount match
//   Return as suggestion (not auto-matched) with confidence score
```

### Reconciliation Calculation

```typescript
// Bank reconciliation summary:
// bankClosingBalance = last transaction balance in the date range
// systemBalance = totalPaymentsReceived - totalPaymentsMade (for the bank account)
// difference = bankClosingBalance - systemBalance - pendingAdjustments
// When difference === 0, the account is fully reconciled for that period
```

## Environment Variables

No additional environment variables needed. All configuration is stored in the database (BankAccount model).

## Dependencies

```json
{
  "csv-parse": "^5.5.0",
  "ofx-js": "^0.2.0",
  "multer": "^1.4.5-lts.1"
}
```
