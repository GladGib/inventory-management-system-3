# Inventory Management System (IMS) for Malaysian SMEs
## Auto Parts, Hardware & Spare Parts Wholesalers

---

## 1. Project Overview

### 1.1 Vision
Build a cloud-based SaaS Inventory Management System targeting Malaysian SMEs in the auto parts, hardware, and spare parts wholesale market. The system will mirror Zoho Inventory's comprehensive feature set while adding Malaysia-specific compliance features.

### 1.2 Target Market
- Auto parts wholesalers and distributors
- Hardware stores and suppliers
- Spare parts dealers (automotive, machinery, electronics)
- Small to medium enterprises (5-100 employees)

### 1.3 Key Differentiators
- Full Malaysian tax compliance (SST, e-Invoice/MyInvois)
- Bilingual support (English & Bahasa Malaysia)
- Local payment gateway integration
- Industry-specific features (part numbers, cross-references, vehicle compatibility)

---

## 2. Technical Architecture

### 2.1 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Backend API** | NestJS + TypeScript | Modular, scalable REST API framework |
| **Database** | PostgreSQL | ACID-compliant relational database |
| **ORM** | Prisma | Type-safe database access |
| **API Docs** | OpenAPI/Swagger | Auto-generated API documentation |
| **Web Frontend** | Next.js 14+ (App Router) | Server-side rendering, SEO |
| **State Management** | TanStack Query | Server state caching & sync |
| **UI Components** | Ant Design 5.x | Enterprise-grade component library |
| **Mobile App** | Flutter | Cross-platform iOS & Android |
| **Cache** | Redis | Session management, caching |
| **Search** | Elasticsearch | Full-text search for items |
| **File Storage** | S3-compatible (MinIO/AWS) | Documents, images |
| **Queue** | BullMQ (Redis) | Background jobs, notifications |

### 2.2 Multi-Tenant Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer (Nginx)                    │
├─────────────────────────────────────────────────────────────┤
│                     API Gateway Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Auth Service│  │ Rate Limiter│  │ Tenant Router│         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                     Application Layer                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Inventory│ │  Sales   │ │ Purchase │ │ Reports  │       │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├─────────────────────────────────────────────────────────────┤
│                      Data Layer                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              PostgreSQL (Schema per Tenant)          │   │
│  │  tenant_001_schema │ tenant_002_schema │ ...         │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    Redis    │  │Elasticsearch│  │  S3 Storage │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

**Multi-tenancy Strategy:** Schema-based isolation (one PostgreSQL schema per tenant)
- Provides strong data isolation
- Enables tenant-specific customizations
- Allows easy tenant data export/deletion

---

## 3. Database Schema Design

### 3.1 Core Entities

```prisma
// Organization & Users
model Organization {
  id              String   @id @default(cuid())
  name            String
  slug            String   @unique
  industry        String   // auto_parts, hardware, spare_parts
  baseCurrency    String   @default("MYR")
  timezone        String   @default("Asia/Kuala_Lumpur")
  sstNumber       String?  // Malaysian SST registration
  businessRegNo   String?  // SSM registration number
  settings        Json     // Organization preferences
  createdAt       DateTime @default(now())
}

model User {
  id              String   @id @default(cuid())
  email           String   @unique
  name            String
  role            Role
  organizationId  String
  preferences     Json
}

// Items & Inventory
model Item {
  id              String   @id @default(cuid())
  sku             String
  name            String
  nameMalay       String?  // Bahasa Malaysia name
  description     String?
  type            ItemType // INVENTORY, SERVICE, NON_INVENTORY
  unit            String
  brand           String?
  partNumber      String?  // OEM/Aftermarket part number
  crossReferences String[] // Alternative part numbers
  vehicleModels   String[] // Compatible vehicles (for auto parts)
  category        String?
  costPrice       Decimal
  sellingPrice    Decimal
  reorderLevel    Decimal
  reorderQty      Decimal
  taxable         Boolean  @default(true)
  taxRate         Decimal?
  trackInventory  Boolean  @default(true)
  trackBatches    Boolean  @default(false)
  trackSerials    Boolean  @default(false)
  images          String[]
  status          Status   @default(ACTIVE)
}

model ItemGroup {
  id              String   @id @default(cuid())
  name            String
  attributes      Json     // Size, Color, Grade, etc.
  items           Item[]
}

model Warehouse {
  id              String   @id @default(cuid())
  name            String
  code            String
  address         String?
  isDefault       Boolean  @default(false)
}

model StockLevel {
  id              String   @id @default(cuid())
  itemId          String
  warehouseId     String
  stockOnHand     Decimal
  committedStock  Decimal  // Reserved for sales orders
  availableStock  Decimal  // Computed: onHand - committed

  @@unique([itemId, warehouseId])
}

// Contacts
model Contact {
  id              String      @id @default(cuid())
  type            ContactType // CUSTOMER, VENDOR, BOTH
  companyName     String
  displayName     String
  email           String?
  phone           String?
  mobile          String?
  address         Address?
  creditLimit     Decimal?
  paymentTerms    Int?        // Days
  taxNumber       String?     // Customer/Vendor SST number
  priceListId     String?
}

// Sales Module
model SalesOrder {
  id              String        @id @default(cuid())
  orderNumber     String        @unique
  customerId      String
  orderDate       DateTime
  expectedShipDate DateTime?
  status          SOStatus      // DRAFT, CONFIRMED, PACKED, SHIPPED, DELIVERED, CLOSED
  invoiceStatus   InvoiceStatus // NOT_INVOICED, PARTIALLY, INVOICED
  paymentStatus   PaymentStatus // UNPAID, PARTIALLY, PAID
  items           SalesOrderItem[]
  subtotal        Decimal
  discount        Decimal
  taxAmount       Decimal
  total           Decimal
  notes           String?
  termsConditions String?
  salesPersonId   String?
}

model Invoice {
  id              String   @id @default(cuid())
  invoiceNumber   String   @unique
  salesOrderId    String?
  customerId      String
  invoiceDate     DateTime
  dueDate         DateTime
  status          InvoiceStatus
  items           InvoiceItem[]
  subtotal        Decimal
  discount        Decimal
  taxAmount       Decimal
  total           Decimal
  amountPaid      Decimal  @default(0)
  balance         Decimal
  eInvoiceId      String?  // MyInvois reference
  eInvoiceStatus  String?
}

// Purchase Module
model PurchaseOrder {
  id              String   @id @default(cuid())
  orderNumber     String   @unique
  vendorId        String
  orderDate       DateTime
  expectedDate    DateTime?
  status          POStatus // DRAFT, ISSUED, PARTIALLY_RECEIVED, RECEIVED, CLOSED
  billStatus      BillStatus
  items           PurchaseOrderItem[]
  subtotal        Decimal
  discount        Decimal
  taxAmount       Decimal
  total           Decimal
  referenceNumber String?  // Supplier quote/reference
}

// Advanced Tracking
model Batch {
  id              String   @id @default(cuid())
  itemId          String
  batchNumber     String
  manufactureDate DateTime?
  expiryDate      DateTime?
  quantity        Decimal
  warehouseId     String
}

model SerialNumber {
  id              String   @id @default(cuid())
  itemId          String
  serialNumber    String   @unique
  status          SerialStatus // IN_STOCK, SOLD, RETURNED
  warehouseId     String?
  soldTo          String?  // Contact ID
}
```

### 3.2 Malaysian Compliance Tables

```prisma
model SSTConfig {
  id              String   @id @default(cuid())
  rate            Decimal  @default(10) // Current SST rate
  registrationNo  String
  effectiveFrom   DateTime
}

model EInvoiceSubmission {
  id              String   @id @default(cuid())
  invoiceId       String
  submissionId    String   // MyInvois submission UUID
  status          String   // PENDING, VALIDATED, REJECTED
  qrCode          String?
  validationTime  DateTime?
  errorDetails    Json?
}

model TaxRate {
  id              String   @id @default(cuid())
  name            String
  rate            Decimal
  type            TaxType  // SST, SERVICE_TAX, EXEMPT, ZERO_RATED
  description     String?
  isDefault       Boolean  @default(false)
}
```

---

## 4. Feature Modules

### 4.1 Module Overview (Zoho Inventory Parity)

| Module | Features | Priority |
|--------|----------|----------|
| **Dashboard** | Sales overview, inventory alerts, pending actions, charts | P0 |
| **Items** | CRUD, groups, composites, variants, images, pricing | P0 |
| **Inventory** | Stock levels, adjustments, transfers, batch/serial tracking | P0 |
| **Sales** | Quotes, orders, invoices, payments, returns, credit notes | P0 |
| **Purchases** | Orders, receives, bills, payments, vendor credits | P0 |
| **Contacts** | Customers, vendors, addresses, payment terms | P0 |
| **Reports** | 50+ reports (inventory, sales, purchases, financial) | P1 |
| **Settings** | Organization, users, taxes, templates, automation | P0 |
| **Warehouses** | Multi-location, bin management, transfers | P1 |
| **Portals** | Customer & vendor self-service portals | P2 |
| **Integrations** | Payment gateways, shipping, accounting | P2 |

### 4.2 Industry-Specific Features (Auto Parts/Hardware)

| Feature | Description |
|---------|-------------|
| **Part Number Search** | Search by OEM number, aftermarket number, cross-reference |
| **Vehicle Compatibility** | Link items to vehicle makes/models/years |
| **Supersession Tracking** | Track when part numbers are superseded |
| **Core/Return Items** | Manage returnable cores (alternators, starters) |
| **Bulk Pricing** | Tiered pricing based on quantity |
| **Quick Quote** | Fast quotation for walk-in customers |
| **Barcode Support** | Print and scan barcodes for inventory |

### 4.3 Malaysian Compliance Features

| Feature | Description |
|---------|-------------|
| **SST Tax System** | 10% Sales Tax / 6% Service Tax handling |
| **MyInvois Integration** | e-Invoice submission to LHDN (mandatory 2024+) |
| **Bilingual Support** | English & Bahasa Malaysia UI and documents |
| **Malaysian Address Format** | State, postcode, address formatting |
| **Local Payment Gateways** | FPX, DuitNow, GrabPay, Touch 'n Go |
| **Malaysian Banks** | Maybank, CIMB, Public Bank, etc. |
| **GST/SST Transition** | Historical support for GST (pre-2018) |

---

## 5. Implementation Phases

### Phase 1: Foundation (Weeks 1-4) ✅ COMPLETED

**Backend Setup:**
- [x] NestJS project scaffolding with modular architecture
- [x] PostgreSQL database setup with Prisma
- [x] Multi-tenant schema implementation
- [x] Authentication (JWT + refresh tokens)
- [x] RBAC authorization system
- [x] API documentation (Swagger/OpenAPI)
- [x] Error handling & logging

**Frontend Setup:**
- [x] Next.js 14 project with App Router
- [x] Ant Design theming and customization
- [x] TanStack Query setup
- [x] Authentication flow
- [x] Layout components (sidebar, header, breadcrumbs)
- [x] Multi-tenant context

**Files Created:**
```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   └── interceptors/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   └── organizations/
│   └── prisma/
│       └── schema.prisma

apps/web/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   └── layout.tsx
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── services/
```

### Phase 2: Core Modules (Weeks 5-10) 🔄 IN PROGRESS

**Items & Inventory:**
- [x] Item CRUD operations
- [x] Categories management
- [x] Stock level tracking
- [x] Inventory adjustments
- [x] Inventory transfers
- [x] Warehouse management
- [ ] Item images upload
- [ ] Item groups and variants

**Contacts:**
- [x] Customer management
- [x] Vendor management
- [ ] Address book
- [ ] Payment terms

**Backend Files Created:**
```
apps/api/src/modules/
├── categories/
│   ├── categories.controller.ts
│   ├── categories.service.ts
│   ├── categories.module.ts
│   └── dto/
├── items/
│   ├── items.controller.ts
│   ├── items.service.ts
│   ├── items.module.ts
│   └── dto/
├── warehouses/
│   ├── warehouses.controller.ts
│   ├── warehouses.service.ts
│   ├── warehouses.module.ts
│   └── dto/
├── inventory/
│   ├── inventory.controller.ts
│   ├── inventory.service.ts
│   ├── inventory.module.ts
│   └── dto/
├── contacts/
│   ├── contacts.controller.ts
│   ├── contacts.service.ts
│   ├── contacts.module.ts
│   └── dto/
```

**Frontend - Pending:**
```
apps/web/src/app/(dashboard)/
├── items/
│   ├── page.tsx
│   ├── [id]/page.tsx
│   └── new/page.tsx
├── inventory/
├── customers/
└── vendors/
```

### Phase 3: Transactions (Weeks 11-16)

**Sales Module:**
- [ ] Sales orders workflow
- [ ] Invoices generation
- [ ] Payment recording
- [ ] Sales returns & credit notes
- [ ] PDF document generation
- [ ] Email notifications

**Purchase Module:**
- [ ] Purchase orders workflow
- [ ] Goods receipt (Purchase Receives)
- [ ] Bills management
- [ ] Vendor payments
- [ ] Vendor credits

**Files to Create:**
```
apps/api/src/modules/
├── sales/
│   ├── orders/
│   ├── invoices/
│   ├── payments/
│   └── returns/
├── purchases/
│   ├── orders/
│   ├── receives/
│   ├── bills/
│   └── payments/

apps/web/src/app/(dashboard)/
├── sales/
│   ├── orders/
│   ├── invoices/
│   └── payments/
├── purchases/
│   ├── orders/
│   ├── receives/
│   └── bills/
```

### Phase 4: Malaysian Compliance (Weeks 17-20)

**Tax & Compliance:**
- [ ] SST tax configuration
- [ ] Tax calculation engine
- [ ] MyInvois API integration
- [ ] e-Invoice generation and submission
- [ ] QR code on invoices

**Localization:**
- [ ] Bahasa Malaysia translations
- [ ] Document templates (BM versions)
- [ ] Malaysian date/number formatting

**Files to Create:**
```
apps/api/src/modules/
├── tax/
│   ├── sst.service.ts
│   └── tax-calculation.service.ts
├── einvoice/
│   ├── myinvois.service.ts
│   └── einvoice.controller.ts

apps/web/src/
├── locales/
│   ├── en.json
│   └── ms.json
```

### Phase 5: Reports & Analytics (Weeks 21-24)

**Reports:**
- [ ] Sales reports (by customer, item, salesperson)
- [ ] Inventory reports (summary, aging, valuation)
- [ ] Purchase reports (by vendor, item)
- [ ] Financial reports (receivables, payables)
- [ ] Export to Excel/PDF

**Dashboard:**
- [ ] KPI widgets
- [ ] Charts (sales trends, inventory turnover)
- [ ] Alerts and notifications

### Phase 6: Advanced Features (Weeks 25-30)

**Advanced Inventory:**
- [ ] Batch tracking
- [ ] Serial number tracking
- [ ] Composite items (Bill of Materials)
- [ ] Reorder point automation

**Portals:**
- [ ] Customer portal
- [ ] Vendor portal

**Integrations:**
- [ ] Payment gateway integration
- [ ] Accounting software export

### Phase 7: Mobile App (Weeks 31-36)

**Flutter App:**
- [ ] Authentication
- [ ] Dashboard
- [ ] Item lookup & barcode scanning
- [ ] Stock adjustments
- [ ] Quick sale/invoice
- [ ] Notifications

---

## 6. API Design

### 6.1 API Structure

```
/api/v1
├── /auth
│   ├── POST /login
│   ├── POST /register
│   ├── POST /refresh
│   └── POST /logout
├── /organizations
│   ├── GET /current
│   └── PUT /current
├── /categories
│   ├── GET /
│   ├── POST /
│   ├── GET /tree
│   ├── GET /:id
│   ├── PUT /:id
│   └── DELETE /:id
├── /items
│   ├── GET /
│   ├── POST /
│   ├── GET /:id
│   ├── PUT /:id
│   ├── DELETE /:id
│   └── GET /:id/stock
├── /warehouses
│   ├── GET /
│   ├── POST /
│   ├── GET /:id
│   ├── PUT /:id
│   └── DELETE /:id
├── /inventory
│   ├── GET /stock
│   ├── GET /stock/:itemId
│   ├── POST /adjustments
│   ├── GET /adjustments
│   ├── POST /transfers
│   ├── GET /transfers
│   ├── PUT /transfers/:id/issue
│   ├── PUT /transfers/:id/receive
│   └── PUT /transfers/:id/cancel
├── /customers
│   ├── GET /
│   ├── POST /
│   ├── GET /:id
│   ├── PUT /:id
│   └── DELETE /:id
├── /vendors
│   ├── GET /
│   ├── POST /
│   ├── GET /:id
│   ├── PUT /:id
│   └── DELETE /:id
├── /sales
│   ├── /orders
│   ├── /invoices
│   ├── /payments
│   └── /returns
├── /purchases
│   ├── /orders
│   ├── /receives
│   ├── /bills
│   └── /payments
├── /reports
│   └── GET /:reportType
└── /settings
    ├── /taxes
    ├── /templates
    └── /users
```

### 6.2 Response Format

```typescript
// Success Response
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 150
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "ITEM_NOT_FOUND",
    "message": "Item with ID xxx not found",
    "details": { ... }
  }
}
```

---

## 7. UI/UX Guidelines

### 7.1 Design System

**Theme (Ant Design Customization):**
```typescript
const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
    fontFamily: 'Inter, -apple-system, sans-serif',
  },
  components: {
    Layout: {
      siderBg: '#001529',
    },
    Menu: {
      darkItemBg: '#001529',
    },
  },
};
```

### 7.2 Page Layouts

**List Pages:**
- Filter bar with common filters
- Search with advanced search option
- Bulk actions toolbar
- Sortable columns
- Pagination

**Detail Pages:**
- Header with entity info and actions
- Tabs for Overview/Transactions/History
- Side panel for related information
- Action buttons (Edit, Print, More)

**Forms:**
- Sectioned layout (Primary, Financial, Additional)
- Inline validation
- Auto-save drafts
- Keyboard shortcuts

### 7.3 Navigation Structure

```
├── Home (Dashboard)
├── Items
│   ├── All Items
│   ├── Item Groups
│   └── Composite Items
├── Inventory
│   ├── Stock Summary
│   ├── Adjustments
│   └── Transfers
├── Sales
│   ├── Sales Orders
│   ├── Invoices
│   ├── Payments Received
│   └── Sales Returns
├── Purchases
│   ├── Purchase Orders
│   ├── Purchase Receives
│   ├── Bills
│   └── Payments Made
├── Reports
└── Settings
```

---

## 8. Testing Strategy

### 8.1 Test Types

| Type | Tools | Coverage Target |
|------|-------|-----------------|
| Unit Tests | Jest | 80% business logic |
| Integration Tests | Jest + Supertest | API endpoints |
| E2E Tests | Playwright | Critical user flows |
| Component Tests | React Testing Library | UI components |

### 8.2 Critical Test Scenarios

1. **Inventory Accuracy**
   - Stock levels update correctly on sales/purchases
   - Committed stock calculation
   - Multi-warehouse transfers

2. **Financial Calculations**
   - Tax calculations (SST)
   - Discount applications
   - Payment allocations

3. **Document Generation**
   - Invoice PDF generation
   - e-Invoice XML compliance

4. **Multi-tenancy**
   - Data isolation between tenants
   - Tenant-specific settings

---

## 9. Deployment Architecture

### 9.1 Hosting (Target)

| Component | Platform |
|-----------|----------|
| Backend API | DigitalOcean Droplets |
| PostgreSQL | DigitalOcean Managed PostgreSQL |
| Web App | Vercel |
| Media Storage | DigitalOcean Spaces (future) |

### 9.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Vercel                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Next.js Web App (SSR/Edge)              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   DigitalOcean Droplets                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              NestJS API Server (Node.js)             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    Managed      │ │   DO Spaces     │ │     Redis       │
│   PostgreSQL    │ │  (S3-compat)    │ │   (future)      │
│  (DigitalOcean) │ │    (future)     │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 9.3 Environment Setup

- **Development:** Local Docker Compose
- **Staging:** Single DigitalOcean Droplet
- **Production:** DigitalOcean Droplets with Managed PostgreSQL

---

## 10. Verification Checklist

### Pre-Launch Verification

- [ ] All API endpoints return correct responses
- [ ] Tax calculations match expected values
- [ ] PDF documents generate correctly
- [ ] e-Invoice submission works with MyInvois sandbox
- [ ] Multi-tenant data isolation verified
- [ ] Performance testing passed (100+ concurrent users)
- [ ] Security audit completed
- [ ] Backup and restore procedures tested

### Post-Launch Monitoring

- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (New Relic/DataDog)
- [ ] Database query performance
- [ ] API response times
- [ ] User activity logging

---

## 11. Project Structure

### 11.1 Monorepo Structure

```
inventory-management-system/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   ├── common/
│   │   │   └── prisma/
│   │   └── package.json
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   └── lib/
│   │   └── package.json
│   └── mobile/                 # Flutter app
│       ├── lib/
│       └── pubspec.yaml
├── packages/
│   ├── shared-types/           # TypeScript types
│   ├── ui-components/          # Shared components
│   └── utils/                  # Shared utilities
├── docker/
│   ├── docker-compose.yml
│   └── Dockerfile.*
├── docs/
│   ├── api/
│   └── guides/
├── openspec/                   # OpenSpec artifacts
│   ├── changes/
│   └── specs/
└── package.json                # Workspace root
```

---

## 12. Current Progress

### Completed
- Phase 1: Foundation (Backend + Frontend scaffolding)
- Phase 2: Backend Core Modules (Categories, Items, Warehouses, Inventory, Contacts)

### In Progress
- Phase 2: Frontend pages for core modules

### Next Steps
1. Complete frontend pages for Items, Inventory, Warehouses, Customers, Vendors
2. Begin Phase 3: Transactions (Sales Orders, Invoices, Purchase Orders, Bills)
3. Add file upload capability for item images
4. Implement item groups and variants
