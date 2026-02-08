# Sales Quotes Module

## Overview
Sales quotation management enabling sales teams to create, send, and track customer quotes. Quotes can be converted to sales orders upon acceptance. Supports the full lifecycle from draft through expiration or conversion, with PDF generation and email sending capabilities.

## Requirements

### QT-001: Create Quote
- **Priority**: P1
- **Description**: Create new sales quote with customer, items, and pricing
- **Acceptance Criteria**:
  - Auto-generate quote number (QT-XXXXXX format, sequential per organization)
  - Select customer from contacts (type CUSTOMER or BOTH)
  - Optional contact person name (free text, for customer's specific contact)
  - Set quote date (defaults to today)
  - Set validity period (validUntil date, defaults to quoteDate + 30 days)
  - Add multiple line items with: item, description override, quantity, unit price, discount, tax rate
  - Apply order-level discount (percentage or fixed)
  - Calculate taxes based on SST rates (date-aware per GST/SST transition spec)
  - Save as DRAFT status
  - Set salesperson (from organization users)
  - Notes and terms & conditions fields
  - Validate: at least one line item, customer required

### QT-002: Quote Statuses
- **Priority**: P1
- **Description**: Manage quote lifecycle through statuses
- **Acceptance Criteria**:
  - DRAFT: Initial state, fully editable
  - SENT: Sent to customer, editable (creates new version)
  - ACCEPTED: Customer accepted, not editable
  - EXPIRED: Past validUntil date, not editable
  - REJECTED: Customer rejected, not editable
  - CONVERTED: Converted to sales order, not editable
  - Status transitions:
    - DRAFT -> SENT (via send action)
    - DRAFT -> ACCEPTED (direct accept without sending)
    - SENT -> ACCEPTED
    - SENT -> REJECTED
    - SENT -> EXPIRED (automatic)
    - DRAFT -> EXPIRED (automatic)
    - ACCEPTED -> CONVERTED (via convert action)
  - Cannot edit quotes in ACCEPTED, EXPIRED, REJECTED, or CONVERTED status
  - Can duplicate any quote to create a new DRAFT

### QT-003: Send Quote
- **Priority**: P1
- **Description**: Send quote to customer via email
- **Acceptance Criteria**:
  - POST /sales/quotes/:id/send endpoint
  - Changes status from DRAFT to SENT
  - Generates PDF and attaches to email
  - Uses customer's email from contact record
  - Email subject: "Quotation {quoteNumber} from {organizationName}"
  - Email body uses existing email template system
  - Records in EmailLog with referenceType 'quote'
  - Can re-send SENT quotes (does not change status)
  - Send action available from quote detail page

### QT-004: Convert Quote to Sales Order
- **Priority**: P1
- **Description**: Create a sales order from an accepted quote
- **Acceptance Criteria**:
  - POST /sales/quotes/:id/convert endpoint
  - Quote must be in ACCEPTED status
  - Creates new SalesOrder with:
    - Same customer
    - Same line items (items, quantities, prices, discounts, taxes)
    - Same salesperson
    - Same terms and conditions
    - Same notes
    - Order date = today
    - Sales order status = DRAFT
  - Sets quote.convertedToOrderId to the new SalesOrder.id
  - Changes quote status to CONVERTED
  - Returns the created sales order
  - Conversion is a one-time operation (cannot convert again)

### QT-005: Quote Expiration Job
- **Priority**: P2
- **Description**: Automatically expire quotes past their validity date
- **Acceptance Criteria**:
  - Scheduled job runs daily (e.g., via NestJS @Cron)
  - Finds quotes where: status IN (DRAFT, SENT) AND validUntil < today
  - Changes status to EXPIRED
  - Logs expired quote numbers
  - Does not send expiration notification (future enhancement)

### QT-006: Quote List Page
- **Priority**: P1
- **Description**: View and manage all quotes
- **Acceptance Criteria**:
  - Route: /sales/quotes
  - Table columns: Quote Number, Customer, Date, Valid Until, Salesperson, Total (RM), Status, Actions
  - Status filter tabs: All, Draft, Sent, Accepted, Expired, Rejected, Converted
  - Date range filter
  - Customer filter (searchable dropdown)
  - Search by quote number
  - Sortable columns: date, total, customer name
  - Pagination (default 20 per page)
  - Status badges with colors:
    - DRAFT: gray
    - SENT: blue
    - ACCEPTED: green
    - EXPIRED: orange
    - REJECTED: red
    - CONVERTED: purple
  - Actions column: View, Edit (if draft/sent), Duplicate, Delete (if draft)
  - Bulk actions: Delete selected drafts
  - Summary cards above table: Total Quotes, Pending (Draft+Sent), Accepted, Conversion Rate

### QT-007: Quote Form Page
- **Priority**: P1
- **Description**: Create and edit quote form
- **Acceptance Criteria**:
  - Route: /sales/quotes/new and /sales/quotes/[id]/edit
  - Same line-items form pattern as sales orders:
    - Customer selector (Ant Design Select with search)
    - Contact person name (text input)
    - Quote date (DatePicker)
    - Valid until (DatePicker, auto-set to quoteDate + 30 days)
    - Salesperson selector
    - Warehouse selector (optional)
    - Reference number (optional text)
  - Line items table:
    - Item selector (searchable, shows SKU and name)
    - Description (auto-populated from item, editable)
    - Quantity (number input)
    - Unit (auto-populated from item)
    - Unit Price (auto-populated from item selling price, editable)
    - Discount type (% or fixed) and value
    - Tax rate (dropdown from active tax rates)
    - Line total (calculated)
    - Add/remove/reorder rows
  - Order-level fields:
    - Discount (type + value)
    - Shipping charges
  - Calculated totals panel:
    - Subtotal
    - Discount amount
    - Tax amount (with breakdown by rate)
    - Grand total
  - Notes textarea
  - Terms & Conditions textarea (pre-populated from organization defaults)
  - Save as Draft button
  - Save & Send button (saves then sends)

### QT-008: Quote Detail Page
- **Priority**: P1
- **Description**: View quote with actions
- **Acceptance Criteria**:
  - Route: /sales/quotes/[id]
  - Header: quote number, status badge, customer name
  - Quote metadata: date, valid until, salesperson, reference
  - Customer details section
  - Line items table (read-only)
  - Totals section
  - Notes and terms
  - Action buttons (contextual based on status):
    - DRAFT: Edit, Send, Accept, Delete, Download PDF
    - SENT: Edit (new version), Accept, Reject, Download PDF, Resend
    - ACCEPTED: Convert to Order, Download PDF
    - CONVERTED: View Sales Order link, Download PDF
    - EXPIRED: Duplicate, Download PDF
    - REJECTED: Duplicate, Download PDF
  - Activity timeline (status changes with timestamps)
  - Linked sales order card (if converted)

### QT-009: Quote PDF Generation
- **Priority**: P1
- **Description**: Generate professional quote PDF document
- **Acceptance Criteria**:
  - Uses existing PDF service (Puppeteer + Handlebars)
  - New template: quote.hbs
  - Company header with logo, name, address, SST number
  - Quote number, date, valid until prominently displayed
  - Customer billing address
  - Contact person name
  - Salesperson
  - Line items table (item, description, qty, unit price, discount, tax, amount)
  - Totals section (subtotal, discount, tax, grand total)
  - Validity note: "This quotation is valid for X days from the date of issue."
  - Terms and conditions
  - Customer acceptance signature block (Name, Signature, Date, Company Stamp)
  - Bilingual support via document-templates-bm spec (locale parameter)
  - A4 format

### QT-010: Quick Quote Modal
- **Priority**: P2
- **Description**: Simplified quick quote creation from dashboard
- **Acceptance Criteria**:
  - Accessible from dashboard via "Quick Quote" button or shortcut
  - Ant Design Modal with simplified form:
    - Customer selector
    - Contact person (optional)
    - Validity (days dropdown: 7, 14, 30, 60, 90)
    - Simplified line items (item, qty, price only, max 5 items)
    - Auto-calculated total
  - Save creates DRAFT quote
  - "Save & Open" navigates to full quote detail page
  - "Save & Send" creates and immediately sends
  - No discount, shipping, or terms fields (use full form for those)

### QT-011: Sidebar Navigation
- **Priority**: P1
- **Description**: Add Quotes to the Sales section in sidebar
- **Acceptance Criteria**:
  - Add "Quotes" menu item under Sales section in sidebar
  - Position: after "Sales Orders" (or before, based on workflow order)
  - Icon: FileTextOutlined (Ant Design icon)
  - Route: /sales/quotes
  - Active state highlighting following existing pattern

## Database Schema

```prisma
model Quote {
  id                String      @id @default(cuid())
  organizationId    String
  quoteNumber       String
  customerId        String
  contactPersonName String?
  quoteDate         DateTime    @default(now())
  validUntil        DateTime
  status            QuoteStatus @default(DRAFT)
  salesPersonId     String?
  warehouseId       String?
  referenceNumber   String?
  shippingAddress   Json?
  billingAddress    Json?
  subtotal          Decimal     @default(0) @db.Decimal(15, 2)
  discountType      DiscountType @default(PERCENTAGE)
  discountValue     Decimal     @default(0) @db.Decimal(15, 2)
  discountAmount    Decimal     @default(0) @db.Decimal(15, 2)
  shippingCharges   Decimal     @default(0) @db.Decimal(15, 2)
  taxAmount         Decimal     @default(0) @db.Decimal(15, 2)
  total             Decimal     @default(0) @db.Decimal(15, 2)
  notes             String?
  termsConditions   String?
  convertedToOrderId String?   @unique
  createdById       String?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  // Relations
  organization    Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  customer        Contact       @relation(fields: [customerId], references: [id])
  salesPerson     User?         @relation("QuoteSalesPerson", fields: [salesPersonId], references: [id])
  createdBy       User?         @relation("QuoteCreatedBy", fields: [createdById], references: [id])
  convertedToOrder SalesOrder?  @relation("QuoteToOrder", fields: [convertedToOrderId], references: [id])
  items           QuoteItem[]

  @@unique([organizationId, quoteNumber])
  @@index([organizationId])
  @@index([customerId])
  @@index([status])
  @@index([quoteDate])
  @@index([validUntil])
  @@index([salesPersonId])
}

model QuoteItem {
  id             String       @id @default(cuid())
  quoteId        String
  itemId         String
  description    String?
  quantity       Decimal      @db.Decimal(15, 4)
  unit           String
  unitPrice      Decimal      @db.Decimal(15, 4)
  discountType   DiscountType @default(PERCENTAGE)
  discountValue  Decimal      @default(0) @db.Decimal(15, 2)
  discountAmount Decimal      @default(0) @db.Decimal(15, 2)
  taxRateId      String?
  taxAmount      Decimal      @default(0) @db.Decimal(15, 2)
  total          Decimal      @db.Decimal(15, 2)
  sortOrder      Int          @default(0)

  // Relations
  quote Quote @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  item  Item  @relation(fields: [itemId], references: [id])

  @@index([quoteId])
  @@index([itemId])
}

enum QuoteStatus {
  DRAFT
  SENT
  ACCEPTED
  EXPIRED
  REJECTED
  CONVERTED
}
```

### Schema Changes to Existing Models

```prisma
// Add to Organization model:
model Organization {
  // ... existing fields ...
  quotes Quote[] // Add relation
}

// Add to Contact model:
model Contact {
  // ... existing fields ...
  quotes Quote[] // Add relation
}

// Add to User model:
model User {
  // ... existing fields ...
  quotesAsSalesPerson Quote[] @relation("QuoteSalesPerson")
  createdQuotes       Quote[] @relation("QuoteCreatedBy")
}

// Add to Item model:
model Item {
  // ... existing fields ...
  quoteItems QuoteItem[] // Add relation
}

// Add to SalesOrder model:
model SalesOrder {
  // ... existing fields ...
  convertedFromQuote Quote? @relation("QuoteToOrder")
}
```

## API Endpoints

```
# Quote CRUD
POST   /api/sales/quotes                    - Create quote
GET    /api/sales/quotes                    - List quotes (with filters)
GET    /api/sales/quotes/:id               - Get quote details
PUT    /api/sales/quotes/:id               - Update quote (DRAFT or SENT only)
DELETE /api/sales/quotes/:id               - Delete quote (DRAFT only)

# Quote Actions
POST   /api/sales/quotes/:id/send          - Send quote to customer (status -> SENT)
POST   /api/sales/quotes/:id/accept        - Accept quote (status -> ACCEPTED)
POST   /api/sales/quotes/:id/reject        - Reject quote (status -> REJECTED)
POST   /api/sales/quotes/:id/convert       - Convert to sales order (status -> CONVERTED)
POST   /api/sales/quotes/:id/duplicate     - Duplicate quote (creates new DRAFT)

# Quote PDF
GET    /api/sales/quotes/:id/pdf           - Generate and download PDF
GET    /api/sales/quotes/:id/pdf?locale=ms - Generate PDF in BM
```

### Request/Response Schemas

```typescript
// POST /api/sales/quotes
interface CreateQuoteRequest {
  customerId: string;
  contactPersonName?: string;
  quoteDate?: string;          // ISO date, default: today
  validUntil?: string;         // ISO date, default: quoteDate + 30 days
  salesPersonId?: string;
  warehouseId?: string;
  referenceNumber?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  items: CreateQuoteItemRequest[];
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  shippingCharges?: number;
  notes?: string;
  termsConditions?: string;
}

interface CreateQuoteItemRequest {
  itemId: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  taxRateId?: string;
  sortOrder?: number;
}

// PUT /api/sales/quotes/:id
interface UpdateQuoteRequest extends Partial<CreateQuoteRequest> {}

// POST /api/sales/quotes/:id/send
interface SendQuoteRequest {
  email?: string;           // Override customer email
  subject?: string;         // Override default subject
  message?: string;         // Custom message body
  ccEmails?: string[];      // CC recipients
}

// POST /api/sales/quotes/:id/reject
interface RejectQuoteRequest {
  reason?: string;          // Rejection reason
}

// GET /api/sales/quotes
interface ListQuotesQuery {
  status?: QuoteStatus;
  customerId?: string;
  salesPersonId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;          // Search quote number
  page?: number;
  limit?: number;
  sortBy?: 'quoteDate' | 'validUntil' | 'total' | 'quoteNumber' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// Response includes pagination
interface ListQuotesResponse {
  data: Quote[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalQuotes: number;
    draftCount: number;
    sentCount: number;
    acceptedCount: number;
    expiredCount: number;
    rejectedCount: number;
    convertedCount: number;
    totalValue: number;       // Sum of all non-expired/rejected quote totals
    conversionRate: number;   // (converted / (converted + rejected + expired)) * 100
  };
}

// POST /api/sales/quotes/:id/convert response
interface ConvertQuoteResponse {
  quote: Quote;             // Updated quote with CONVERTED status
  salesOrder: SalesOrder;   // Newly created sales order
}
```

## Frontend Pages

### Page Structure

```
apps/web/app/(dashboard)/sales/quotes/
├── page.tsx                          # Quote list page
├── new/
│   └── page.tsx                      # Create quote form
├── [id]/
│   ├── page.tsx                      # Quote detail page
│   └── edit/
│       └── page.tsx                  # Edit quote form
├── components/
│   ├── QuoteListTable.tsx            # List table with actions
│   ├── QuoteForm.tsx                 # Create/edit form (shared)
│   ├── QuoteDetail.tsx               # Detail view with actions
│   ├── QuoteStatusBadge.tsx          # Color-coded status badge
│   ├── QuoteSummaryCards.tsx         # Summary statistics cards
│   ├── QuoteActionButtons.tsx        # Contextual action buttons
│   ├── QuoteTimeline.tsx             # Status change timeline
│   ├── SendQuoteModal.tsx            # Email send modal
│   ├── RejectQuoteModal.tsx          # Rejection reason modal
│   ├── ConvertConfirmModal.tsx       # Convert to SO confirmation
│   ├── QuickQuoteModal.tsx           # Simplified quick quote modal
│   └── PdfLanguageDropdown.tsx       # PDF download with locale selection

apps/web/components/
└── QuickQuoteButton.tsx              # Dashboard quick quote trigger
```

### /sales/quotes List Page

```tsx
// Layout:
// - Breadcrumb: Sales > Quotes
// - Header: "Sales Quotes" title with "New Quote" button (primary) and "Quick Quote" button
// - Summary cards row: Total Quotes | Pending | Accepted | Conversion Rate
// - Status filter tabs: All | Draft | Sent | Accepted | Expired | Rejected | Converted
// - Filter bar: Date range picker, Customer select, Search input
// - Table: QuoteListTable component
// - Pagination at bottom

// Table columns:
// | Quote #     | Customer        | Date       | Valid Until | Salesperson | Total (RM) | Status    | Actions |
// | QT-000001   | ABC Trading Sdn | 15/01/2025 | 14/02/2025 | John Doe    | 15,600.00  | [SENT]    | ... |
```

### /sales/quotes/new and /sales/quotes/[id]/edit Form Page

```tsx
// Same pattern as sales order form:
// - Breadcrumb: Sales > Quotes > New Quote (or Edit QT-XXXXXX)
// - Two-column layout:
//   Left column (wider): Line items form
//   Right column (narrower): Metadata (customer, dates, salesperson)
//
// Right column fields:
// - Customer* (Select with search)
// - Contact Person (Input)
// - Quote Date* (DatePicker)
// - Valid Until* (DatePicker, auto-calculated)
// - Salesperson (Select)
// - Reference Number (Input)
//
// Left column:
// - Line items table with add/remove/reorder
// - Order-level discount row
// - Shipping charges row
// - Totals panel (sticky at bottom)
// - Notes (TextArea)
// - Terms & Conditions (TextArea)
//
// Footer buttons:
// - [Cancel] [Save as Draft] [Save & Send]
// - Cancel navigates back to list
```

### /sales/quotes/[id] Detail Page

```tsx
// Layout:
// - Breadcrumb: Sales > Quotes > QT-XXXXXX
// - Header: Quote number + status badge
// - Action buttons bar (contextual):
//   DRAFT:    [Edit] [Send] [Accept] [Delete] [PDF v]
//   SENT:     [Edit] [Accept] [Reject] [Resend] [PDF v]
//   ACCEPTED: [Convert to Sales Order] [PDF v]
//   CONVERTED: [View Sales Order ->] [PDF v]
//   EXPIRED/REJECTED: [Duplicate] [PDF v]
//
// - Two-column detail layout:
//   Left: Customer info, addresses
//   Right: Quote metadata (number, date, valid until, salesperson, reference)
//
// - Line items table (read-only)
// - Totals section
// - Notes section (if present)
// - Terms section (if present)
//
// - Linked Sales Order card (if status is CONVERTED):
//   - Shows order number, status, total
//   - Click to navigate to sales order
//
// - Activity Timeline at bottom:
//   - "Quote created" (createdAt)
//   - "Quote sent to customer" (if sent)
//   - "Quote accepted" (if accepted)
//   - "Quote converted to SO-XXXXXX" (if converted)
//   - "Quote rejected: {reason}" (if rejected)
//   - "Quote expired" (if expired)
```

### Quick Quote Modal

```tsx
// Ant Design Modal (width: 720px)
// Title: "Quick Quote"
//
// Form fields:
// - Customer* (Select with search)
// - Contact Person (Input, optional)
// - Validity* (Select: 7 days, 14 days, 30 days, 60 days, 90 days)
//
// Simplified line items (max 5):
// | Item*          | Qty* | Unit Price* | Total    |
// | [Select item]  | [1]  | [0.00]      | RM 0.00  |
// | + Add Item                                      |
//
// Total: RM X,XXX.XX
//
// Footer buttons: [Cancel] [Save as Draft] [Save & Open] [Save & Send]
```

## Hooks

```typescript
// apps/web/hooks/use-quotes.ts

export function useQuotes(filters: ListQuotesQuery);
export function useQuote(id: string);
export function useCreateQuote();
export function useUpdateQuote();
export function useDeleteQuote();

export function useSendQuote();
export function useAcceptQuote();
export function useRejectQuote();
export function useConvertQuote();
export function useDuplicateQuote();

export function useQuotePdf(id: string, locale?: string);
export function useQuoteSummary(); // Summary statistics for list page
```

## Business Logic

### Quote Number Generation
```typescript
// Pattern: QT-XXXXXX (e.g., QT-000001)
// Sequential per organization
// Find max quote number for org, increment by 1
// Pad to 6 digits
async function generateQuoteNumber(organizationId: string): Promise<string> {
  const lastQuote = await prisma.quote.findFirst({
    where: { organizationId },
    orderBy: { quoteNumber: 'desc' },
    select: { quoteNumber: true },
  });

  const lastNum = lastQuote
    ? parseInt(lastQuote.quoteNumber.replace('QT-', ''), 10)
    : 0;

  return `QT-${String(lastNum + 1).padStart(6, '0')}`;
}
```

### Quote to Sales Order Conversion
```typescript
async function convertToSalesOrder(quoteId: string, userId: string): Promise<SalesOrder> {
  const quote = await getQuoteWithItems(quoteId);

  if (quote.status !== 'ACCEPTED') {
    throw new BadRequestException('Only accepted quotes can be converted');
  }

  if (quote.convertedToOrderId) {
    throw new BadRequestException('Quote has already been converted');
  }

  return prisma.$transaction(async (tx) => {
    // Generate SO number
    const orderNumber = await generateOrderNumber(quote.organizationId);

    // Create sales order
    const salesOrder = await tx.salesOrder.create({
      data: {
        organizationId: quote.organizationId,
        orderNumber,
        customerId: quote.customerId,
        orderDate: new Date(),
        status: 'DRAFT',
        invoiceStatus: 'NOT_INVOICED',
        paymentStatus: 'UNPAID',
        shipmentStatus: 'NOT_SHIPPED',
        salesPersonId: quote.salesPersonId,
        warehouseId: quote.warehouseId,
        referenceNumber: quote.quoteNumber, // Reference back to quote
        billingAddress: quote.billingAddress,
        shippingAddress: quote.shippingAddress,
        subtotal: quote.subtotal,
        discountType: quote.discountType,
        discountValue: quote.discountValue,
        discountAmount: quote.discountAmount,
        shippingCharges: quote.shippingCharges,
        taxAmount: quote.taxAmount,
        total: quote.total,
        notes: quote.notes,
        termsConditions: quote.termsConditions,
        createdById: userId,
        items: {
          create: quote.items.map((item) => ({
            itemId: item.itemId,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.unitPrice,
            discountType: item.discountType,
            discountValue: item.discountValue,
            discountAmount: item.discountAmount,
            taxRateId: item.taxRateId,
            taxAmount: item.taxAmount,
            amount: item.total,
            sortOrder: item.sortOrder,
          })),
        },
      },
    });

    // Update quote status and link
    await tx.quote.update({
      where: { id: quoteId },
      data: {
        status: 'CONVERTED',
        convertedToOrderId: salesOrder.id,
      },
    });

    return salesOrder;
  });
}
```

### Expiration Cron Job
```typescript
// apps/api/src/modules/quotes/quote-expiration.job.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class QuoteExpirationJob {
  private readonly logger = new Logger(QuoteExpirationJob.name);

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiration() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.prisma.quote.updateMany({
      where: {
        status: { in: ['DRAFT', 'SENT'] },
        validUntil: { lt: today },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} quotes past their validity date`);
    }
  }
}
```

## NestJS Module Structure

```
apps/api/src/modules/quotes/
├── quotes.module.ts
├── quotes.controller.ts
├── quotes.service.ts
├── quote-expiration.job.ts          # Cron job for auto-expiration
├── dto/
│   ├── create-quote.dto.ts
│   ├── update-quote.dto.ts
│   ├── send-quote.dto.ts
│   ├── reject-quote.dto.ts
│   └── list-quotes-query.dto.ts
└── tests/
    ├── quotes.controller.spec.ts
    ├── quotes.service.spec.ts
    └── quote-expiration.job.spec.ts
```

## Email Template

```typescript
// Email sent when quote is sent to customer
interface QuoteEmailData {
  quoteNumber: string;
  customerName: string;
  contactPersonName?: string;
  organizationName: string;
  quoteDate: string;
  validUntil: string;
  total: string;           // Formatted: "RM 15,600.00"
  itemCount: number;
  pdfAttachment: Buffer;
}

// Subject: "Quotation QT-000001 from ABC Hardware Sdn Bhd"
// Body template uses existing email template infrastructure
```

## Dependencies
- Existing SalesOrder module (conversion target)
- Existing Contact module (customer selection)
- Existing Item module (line items)
- Existing TaxRate module (tax calculation)
- Existing PDF service (quote PDF generation)
- Existing Email service (sending quotes)
- Document Templates BM spec (bilingual PDF support)
- NestJS Schedule module (@nestjs/schedule) for expiration cron job
