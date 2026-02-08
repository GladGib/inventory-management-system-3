# Vendor Self-Service Portal

## Overview
A token-based self-service portal allowing vendors (suppliers) to view their purchase orders, bills, payment status, and manage delivery information. Vendors can acknowledge purchase orders, update delivery dates, and submit Advanced Shipping Notices (ASN). The portal uses the same `PortalAccess` model as the customer portal with `type=VENDOR` and operates under `/portal/vendor/[token]`.

## Requirements

### VP-001: Vendor Portal Access
- **Priority**: P0
- **Description**: Token-based access for vendors using the shared PortalAccess model
- **Acceptance Criteria**:
  - Uses the same `PortalAccess` model with `type=VENDOR`
  - Same invitation flow as customer portal (POST /api/portal/invite with type=VENDOR)
  - Token verification via `GET /api/portal/vendor/verify?token=xxx`
  - Vendor portal link format: `{APP_URL}/portal/vendor/{token}`
  - Same security model: rate limiting, token validation, data scoping
  - Invitation email uses vendor-specific template

### VP-002: Vendor Portal Dashboard
- **Priority**: P0
- **Description**: Overview page for vendor account
- **Acceptance Criteria**:
  - Display vendor company name and contact info
  - Summary cards: Pending POs (awaiting acknowledgement), Upcoming Deliveries (next 30 days), Total Billed (this year), Total Payments Received
  - List of POs pending acknowledgement (top 5) with quick acknowledge button
  - Upcoming deliveries timeline (next 7 days)
  - Payment summary: total paid this month, outstanding bills balance
  - Organization branding (logo, colors) in portal header

### VP-003: Vendor Purchase Orders Page
- **Priority**: P0
- **Description**: List and view purchase orders issued to this vendor
- **Acceptance Criteria**:
  - Display all purchase orders for this vendor, sorted by date descending
  - Show: PO number, date, status (color-coded badge), expected date, total, receive status
  - Filter by status (All, Issued, Partially Received, Received, Closed)
  - Filter by date range
  - Search by PO number or reference
  - Pagination (20 per page)
  - Highlight POs awaiting acknowledgement with a notification badge

### VP-004: Vendor PO Detail Page
- **Priority**: P0
- **Description**: View individual purchase order with full details
- **Acceptance Criteria**:
  - Display PO header: PO number, date, status, expected delivery date, delivery warehouse address
  - Display line items: item name, description, quantity ordered, quantity received, unit price, total
  - Display PO totals: subtotal, discount, tax, shipping, grand total
  - Display delivery address
  - Show notes/terms and conditions
  - "Acknowledge PO" button for ISSUED POs
  - "Update Delivery Date" button
  - Download PO as PDF

### VP-005: PO Acknowledgement
- **Priority**: P0
- **Description**: Vendor acknowledges receipt and acceptance of a purchase order
- **Acceptance Criteria**:
  - `POST /api/portal/vendor/purchase-orders/:id/acknowledge`
  - Only applicable to POs in ISSUED status
  - Acknowledge action records: timestamp, vendor reference number (optional), notes
  - Store acknowledgement data in PO notes or a dedicated field
  - Send notification email to the PO creator (purchasing staff)
  - After acknowledgement, PO remains in ISSUED status but is marked as acknowledged
  - Vendor can optionally flag items they cannot fulfill with a reason

### VP-006: Delivery Date Update
- **Priority**: P0
- **Description**: Vendor updates expected delivery date for a PO
- **Acceptance Criteria**:
  - `POST /api/portal/vendor/purchase-orders/:id/update-delivery`
  - Body: `{ expectedDate: string, reason?: string }`
  - Updates the `expectedDate` field on the PurchaseOrder
  - Only allowed for POs in ISSUED or PARTIALLY_RECEIVED status
  - Log the change with previous date, new date, reason, and timestamp
  - Send notification email to PO creator about date change
  - Append update note to PO notes field

### VP-007: Advanced Shipping Notice (ASN)
- **Priority**: P1
- **Description**: Vendor submits shipping notification for a purchase order
- **Acceptance Criteria**:
  - `POST /api/portal/vendor/asn`
  - Body includes: purchaseOrderId, shippingDate, estimatedArrival, trackingNumber, carrier, items (itemId, quantity), notes
  - Create an `AdvancedShippingNotice` record linked to the PO
  - Validate quantities against PO line items (cannot ship more than ordered minus already shipped)
  - Send notification email to purchasing staff
  - ASN can be viewed on the PO detail page
  - Vendor can view list of submitted ASNs

### VP-008: Vendor Bills Page
- **Priority**: P0
- **Description**: View bills and payment status
- **Acceptance Criteria**:
  - Display all bills for this vendor, sorted by date descending
  - Show: bill number, vendor bill number, date, due date, status, total, balance
  - Highlight overdue bills
  - Filter by status (All, Open, Partially Paid, Paid, Overdue)
  - Filter by date range
  - Search by bill number
  - Pagination (20 per page)
  - Show payment history per bill on detail view

### VP-009: Vendor Bill Detail
- **Priority**: P0
- **Description**: View individual bill with payment information
- **Acceptance Criteria**:
  - Display bill header: bill number, vendor bill number, date, due date, status
  - Display line items: description, quantity, unit price, tax, total
  - Display totals: subtotal, discount, tax, total, amount paid, balance
  - Linked purchase order reference
  - Payment history: date, amount, method, reference
  - Payment status clearly displayed

### VP-010: Vendor Profile Page
- **Priority**: P1
- **Description**: View and update vendor company information
- **Acceptance Criteria**:
  - Display current info: company name, display name, email, phone, mobile, website
  - Display billing address
  - Allow editing: email, phone, mobile, website, billing address
  - Do NOT allow editing: company name, tax number, payment terms
  - Validation for email and phone formats
  - Show last updated timestamp

### VP-011: Vendor Portal Layout
- **Priority**: P0
- **Description**: Responsive portal layout for vendors
- **Acceptance Criteria**:
  - Same layout approach as customer portal (PortalLayout component reused)
  - Header: organization logo, vendor name, exit button
  - Navigation: Dashboard, Purchase Orders, Bills, ASN, Profile
  - Mobile responsive with hamburger menu
  - Inherit organization branding (logo, primary color)
  - All pages under `/portal/vendor/[token]/...`

### VP-012: Vendor Portal Email Template
- **Priority**: P0
- **Description**: HTML email template for vendor portal invitation
- **Acceptance Criteria**:
  - Professional HTML email with organization branding
  - Body: "You have been invited to access your vendor portal"
  - "Access Portal" button with link
  - Plain text link fallback
  - Expiry date mention
  - Organization contact information
  - Mobile-responsive

## Data Models

### AdvancedShippingNotice (New Model)

```prisma
model AdvancedShippingNotice {
  id               String    @id @default(cuid())
  asnNumber        String    @unique
  purchaseOrderId  String
  purchaseOrder    PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])
  vendorId         String
  vendor           Contact   @relation("ASNVendor", fields: [vendorId], references: [id])
  shippingDate     DateTime
  estimatedArrival DateTime
  trackingNumber   String?
  carrier          String?
  notes            String?
  status           ASNStatus @default(SUBMITTED)
  organizationId   String
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  items            ASNItem[]

  @@index([purchaseOrderId])
  @@index([vendorId])
  @@index([organizationId])
  @@index([status])
}

model ASNItem {
  id                       String                @id @default(cuid())
  advancedShippingNoticeId String
  advancedShippingNotice   AdvancedShippingNotice @relation(fields: [advancedShippingNoticeId], references: [id], onDelete: Cascade)
  purchaseOrderItemId      String
  itemId                   String
  quantity                 Decimal               @db.Decimal(15, 4)
  batchNumber              String?
  serialNumbers            String[]
  notes                    String?

  @@index([advancedShippingNoticeId])
  @@index([itemId])
}

enum ASNStatus {
  SUBMITTED
  ACKNOWLEDGED
  IN_TRANSIT
  DELIVERED
  CANCELLED
}
```

### Schema Changes

Add to `PurchaseOrder` model:
```prisma
acknowledgedAt      DateTime?
acknowledgedNotes   String?
vendorReference     String?
advancedShippingNotices AdvancedShippingNotice[]
```

Add to `Contact` model:
```prisma
advancedShippingNotices AdvancedShippingNotice[] @relation("ASNVendor")
```

Add to `Organization` model (if not already added by customer-portal):
```prisma
portalAccesses          PortalAccess[]
advancedShippingNotices AdvancedShippingNotice[]
```

## API Endpoints

### Vendor Portal (Token-authenticated)

All endpoints require `X-Portal-Token` header.

```
GET    /api/portal/vendor/verify?token=xxx              - Verify vendor portal token
  Response: {
    valid: true,
    vendor: { id, companyName, displayName, email },
    organization: { name, logoUrl, primaryColor, phone, email }
  }

GET    /api/portal/vendor/dashboard                      - Get vendor dashboard summary
  Response: {
    pendingPOsCount: number,
    upcomingDeliveries: { date, poNumber, itemCount }[],
    totalBilledThisYear: number,
    totalPaymentsReceived: number,
    outstandingBillsBalance: number,
    pendingPOs: PurchaseOrder[],
    upcomingDeliveryTimeline: PurchaseOrder[]
  }

GET    /api/portal/vendor/purchase-orders                - List vendor's POs
  Query: { status?, dateFrom?, dateTo?, search?, page?, limit? }
  Response: PaginatedResponse<PurchaseOrder>

GET    /api/portal/vendor/purchase-orders/:id            - Get PO detail
  Response: PurchaseOrder (with items, delivery address, ASNs)

POST   /api/portal/vendor/purchase-orders/:id/acknowledge - Acknowledge PO
  Body: { vendorReference?: string, notes?: string, unfulfillableItems?: { itemId: string, reason: string }[] }
  Response: { success: true, purchaseOrder: PurchaseOrder }

POST   /api/portal/vendor/purchase-orders/:id/update-delivery - Update delivery date
  Body: { expectedDate: string, reason?: string }
  Response: { success: true, purchaseOrder: PurchaseOrder }

GET    /api/portal/vendor/purchase-orders/:id/pdf        - Download PO PDF
  Response: PDF file stream

GET    /api/portal/vendor/bills                          - List vendor's bills
  Query: { status?, dateFrom?, dateTo?, search?, page?, limit? }
  Response: PaginatedResponse<Bill>

GET    /api/portal/vendor/bills/:id                      - Get bill detail
  Response: Bill (with items, payments)

POST   /api/portal/vendor/asn                            - Create Advanced Shipping Notice
  Body: {
    purchaseOrderId: string,
    shippingDate: string,
    estimatedArrival: string,
    trackingNumber?: string,
    carrier?: string,
    notes?: string,
    items: { purchaseOrderItemId: string, itemId: string, quantity: number, batchNumber?: string, serialNumbers?: string[] }[]
  }
  Response: AdvancedShippingNotice

GET    /api/portal/vendor/asn                            - List vendor's ASNs
  Query: { purchaseOrderId?, status?, page?, limit? }
  Response: PaginatedResponse<AdvancedShippingNotice>

GET    /api/portal/vendor/asn/:id                        - Get ASN detail
  Response: AdvancedShippingNotice (with items)

GET    /api/portal/vendor/profile                        - Get vendor profile
  Response: Contact (with addresses)

PUT    /api/portal/vendor/profile                        - Update vendor profile
  Body: { email?, phone?, mobile?, website?, billingAddress? }
  Response: Contact (updated)
```

## Frontend Pages & Components

### Route Structure (apps/web)

```
/portal/vendor/[token]                   - Token verification + redirect to dashboard
/portal/vendor/[token]/dashboard         - Dashboard
/portal/vendor/[token]/purchase-orders   - PO list
/portal/vendor/[token]/purchase-orders/[id] - PO detail
/portal/vendor/[token]/bills             - Bills list
/portal/vendor/[token]/bills/[id]        - Bill detail
/portal/vendor/[token]/asn              - ASN list
/portal/vendor/[token]/asn/create       - Create ASN
/portal/vendor/[token]/asn/[id]         - ASN detail
/portal/vendor/[token]/profile          - Profile edit
```

### Vendor Dashboard Page

```tsx
// apps/web/src/app/portal/vendor/[token]/dashboard/page.tsx

// Components:
// - Ant Design: Row, Col, Card, Statistic, Table, Tag, Timeline, List, Button
// - 4 summary cards: Pending POs, Upcoming Deliveries, Billed This Year, Payments Received
// - Pending POs table with quick "Acknowledge" button per row
// - Upcoming deliveries timeline (next 7 days with PO number, item count)
// - Outstanding bills balance alert (if > 0)
```

### Purchase Orders List Page

```tsx
// apps/web/src/app/portal/vendor/[token]/purchase-orders/page.tsx

// Components:
// - Ant Design: Table, Input.Search, Select, DatePicker.RangePicker, Tag, Badge, Space
// - Badge on "Awaiting Acknowledgement" POs
// - Filters: status, date range, search
// - Table columns: PO #, Date, Expected Date, Status, Total, Receive Status, Acknowledged?
// - Click to navigate to detail
```

### PO Detail Page

```tsx
// apps/web/src/app/portal/vendor/[token]/purchase-orders/[id]/page.tsx

// Components:
// - Ant Design: Descriptions, Table, Tag, Button, Card, Modal, Form, DatePicker, Input
// - PO header with Descriptions
// - Line items table: Item, Description, Qty Ordered, Qty Received, Unit Price, Total
// - PO totals section
// - Delivery address card
// - "Acknowledge PO" button with modal (vendor reference, notes, unfulfillable items)
// - "Update Delivery Date" button with modal (new date, reason)
// - "Create ASN" button (navigate to ASN create with PO pre-selected)
// - ASN history table (if any ASNs exist)
// - Download PDF button
```

### Bills List Page

```tsx
// apps/web/src/app/portal/vendor/[token]/bills/page.tsx

// Components:
// - Ant Design: Table, Input.Search, Select, DatePicker.RangePicker, Tag
// - Filters: status, date range, search
// - Table columns: Bill #, Vendor Bill #, Date, Due Date, Status, Total, Balance
// - Overdue highlighting
// - Click for detail
```

### Bill Detail Page

```tsx
// apps/web/src/app/portal/vendor/[token]/bills/[id]/page.tsx

// Components:
// - Ant Design: Descriptions, Table, Tag, Card
// - Bill header: numbers, dates, status
// - Line items table
// - Totals breakdown
// - Linked PO reference
// - Payment history table
```

### ASN List Page

```tsx
// apps/web/src/app/portal/vendor/[token]/asn/page.tsx

// Components:
// - Ant Design: Table, Tag, Button, Space
// - Table columns: ASN #, PO #, Shipping Date, Est. Arrival, Tracking, Status
// - "Create ASN" button
// - Filter by PO, status
```

### ASN Create Page

```tsx
// apps/web/src/app/portal/vendor/[token]/asn/create/page.tsx

// Components:
// - Ant Design: Form, Select, DatePicker, Input, Table, InputNumber, Button, Steps
// - Step 1: Select PO (dropdown of ISSUED/PARTIALLY_RECEIVED POs)
// - Step 2: Enter shipping details (date, est. arrival, tracking, carrier)
// - Step 3: Select items and quantities from the PO line items
//   - Table showing PO items with: Item, Ordered Qty, Already Shipped Qty, Ship Qty (editable)
//   - Optional batch number and serial numbers per item
// - Step 4: Review and submit
// - Validation: quantities cannot exceed remaining (ordered - already shipped)
```

### Profile Page

```tsx
// apps/web/src/app/portal/vendor/[token]/profile/page.tsx

// Same pattern as customer portal profile
// Editable: email, phone, mobile, website, billing address
// Read-only: company name, tax number, payment terms
```

## Business Logic

### PO Acknowledgement Flow

1. Vendor views PO in portal
2. Clicks "Acknowledge PO"
3. Modal opens with optional vendor reference and notes
4. Vendor can flag items they cannot fulfill
5. System records acknowledgement timestamp and data on PO
6. Email notification sent to PO creator
7. PO status remains ISSUED (acknowledged is tracked separately)

### Delivery Date Update Flow

1. Vendor views PO detail
2. Clicks "Update Delivery Date"
3. Modal opens with date picker and reason field
4. System validates new date is in the future
5. Updates `expectedDate` on PurchaseOrder
6. Appends note: "Delivery date updated by vendor from {old} to {new}. Reason: {reason}"
7. Email notification to PO creator

### ASN Creation Flow

1. Vendor navigates to Create ASN
2. Selects PO from available POs
3. System loads PO line items with remaining shippable quantities
4. Vendor enters shipping details and selects items/quantities
5. System validates quantities against PO
6. Creates ASN record with items
7. Email notification to purchasing staff
8. ASN appears on PO detail page

### Data Scoping

- All portal queries filter by `vendorId` from the verified `PortalAccess.contactId`
- Purchase orders: `WHERE vendorId = contactId AND organizationId = orgId`
- Bills: `WHERE vendorId = contactId AND organizationId = orgId`
- ASNs: `WHERE vendorId = contactId AND organizationId = orgId`

## Dependencies

Shares dependencies with the customer portal spec. No additional packages required.
