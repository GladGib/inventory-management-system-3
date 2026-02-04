# P1/P2 Expanded Features - Technical Design

## Architecture Overview

### PDF Generation Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  GET /api/sales/orders/:id/pdf                              │
│  GET /api/sales/invoices/:id/pdf                            │
│  GET /api/purchases/orders/:id/pdf                          │
│  GET /api/purchases/bills/:id/pdf                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   PDF Service Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │TemplateEngine│  │  PDFRenderer │  │ StorageService│      │
│  │   (EJS/HBS)  │  │  (Puppeteer) │  │   (MinIO)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Email Notification Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Event Triggers                            │
│  Invoice Created │ Payment Received │ Order Confirmed        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Notification Service                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │TemplateEngine│  │  EmailService│  │  QueueService│      │
│  │   (EJS/HBS)  │  │  (Nodemailer)│  │  (BullMQ)   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Component Specifications

### 1. PDF Generation

#### Technology Stack
- **PDFKit** or **Puppeteer** for PDF rendering
- **Handlebars** for HTML templates
- **MinIO** for PDF storage (optional caching)

#### PDF Templates
```
templates/
├── sales-order.hbs
├── invoice.hbs
├── purchase-order.hbs
├── bill.hbs
└── partials/
    ├── header.hbs
    ├── footer.hbs
    ├── line-items-table.hbs
    └── company-info.hbs
```

#### PDF Content Structure
- Company letterhead (logo, name, address, SST number)
- Document details (number, date, due date)
- Customer/Vendor information
- Line items table with SKU, description, qty, price, tax, total
- Subtotal, discount, tax breakdown, grand total
- Terms and conditions
- Footer with page numbers

### 2. Item Images UI

#### Components
```typescript
// ImageUploader component
interface ImageUploaderProps {
  itemId: string;
  images: string[];
  maxImages: number;
  onUpload: (url: string) => void;
  onDelete: (imageId: string) => void;
  onReorder: (images: string[]) => void;
}
```

#### Upload Flow
1. User selects file
2. Frontend requests presigned URL from API
3. Frontend uploads directly to MinIO/S3
4. Frontend confirms upload to API
5. API updates item images array

### 3. Address Book

#### Database Schema Addition
```prisma
model Address {
  id              String   @id @default(cuid())
  contactId       String
  contact         Contact  @relation(fields: [contactId], references: [id])
  label           String   // "Billing", "Shipping", "Head Office"
  addressLine1    String
  addressLine2    String?
  city            String
  state           String
  postcode        String
  country         String   @default("Malaysia")
  isDefault       Boolean  @default(false)
  isBilling       Boolean  @default(false)
  isShipping      Boolean  @default(false)
  organizationId  String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 4. Payment Terms

#### Database Schema Addition
```prisma
model PaymentTerm {
  id              String   @id @default(cuid())
  name            String   // "Net 30", "Net 60", "COD"
  days            Int      // Number of days
  description     String?
  isDefault       Boolean  @default(false)
  organizationId  String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  customers       Contact[] @relation("CustomerPaymentTerm")
  vendors         Contact[] @relation("VendorPaymentTerm")
}
```

### 5. Sales Returns & Credit Notes

#### UI Components
- Sales Returns List page
- Create/Edit Sales Return form
- Sales Return Detail page
- Credit Note generation from return

#### Workflow
1. Create return (link to invoice/order)
2. Approve return
3. Receive items back
4. Generate credit note
5. Apply to customer balance

### 6. Vendor Credits

#### Database Schema
```prisma
model VendorCredit {
  id              String   @id @default(cuid())
  creditNumber    String   @unique
  vendorId        String
  vendor          Contact  @relation(fields: [vendorId], references: [id])
  creditDate      DateTime
  amount          Decimal
  balance         Decimal
  status          CreditStatus
  reason          String?
  notes           String?
  billId          String?  // If from bill adjustment
  purchaseReturnId String? // If from return
  organizationId  String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum CreditStatus {
  OPEN
  PARTIALLY_APPLIED
  FULLY_APPLIED
  VOID
}
```

### 7. SST Tax UI

#### Settings Pages
- Tax Rates list with CRUD
- Organization SST Settings form
- Tax assignment to items (bulk update)

### 8. Report Exports

#### Export Service
```typescript
interface ExportService {
  exportToExcel(reportData: ReportData): Promise<Buffer>;
  exportToPdf(reportData: ReportData): Promise<Buffer>;
}

interface ReportData {
  title: string;
  subtitle?: string;
  columns: ColumnDef[];
  rows: Record<string, any>[];
  summary?: Record<string, any>;
  generatedAt: Date;
}
```

### 9. Email Notifications

#### Notification Types
| Event | Recipients | Template |
|-------|------------|----------|
| Invoice Created | Customer | invoice-created.hbs |
| Payment Received | Customer | payment-received.hbs |
| Sales Order Confirmed | Customer | order-confirmed.hbs |
| PO Issued | Vendor | po-issued.hbs |
| Payment Made | Vendor | payment-made.hbs |

#### Email Service Configuration
```typescript
interface EmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: {
    name: string;
    email: string;
  };
}
```

## Implementation Order

### Phase A: PDF Generation (Foundation)
1. Set up PDF service with Puppeteer
2. Create HTML templates
3. Implement API endpoints
4. Add download buttons to detail pages

### Phase B: Core Modules
1. Item images upload UI
2. Address book CRUD
3. Payment terms CRUD
4. Item groups UI

### Phase C: Transactions
1. Sales returns backend completion
2. Sales returns frontend
3. Credit notes
4. Vendor credits
5. Purchase receives form

### Phase D: Tax & Reports
1. SST configuration UI
2. Stock aging report
3. Export to Excel
4. Export to PDF
5. Email notifications

## Testing Strategy

### Unit Tests
- PDF generation with mock data
- Tax calculations
- Report data aggregation

### Integration Tests
- Full PDF generation flow
- Email delivery (test mode)
- Export file integrity

### E2E Tests
- Upload item image flow
- Create sales return and credit note
- Configure tax rates and verify on invoices
