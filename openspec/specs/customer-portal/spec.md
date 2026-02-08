# Customer Self-Service Portal

## Overview
A token-based self-service portal allowing customers to view their orders, invoices, payments, and account information without requiring full application authentication. The portal operates under a separate route group (`/portal/customer/[token]`) with its own responsive layout, independent from the main application dashboard.

## Requirements

### CP-001: Portal Access Model
- **Priority**: P0
- **Description**: Token-based access system for customer portal
- **Acceptance Criteria**:
  - Create `PortalAccess` model to manage portal tokens
  - Each token is unique and tied to a specific contact (customer or vendor)
  - Tokens have an expiration date (`expiresAt`)
  - Tokens can be deactivated (`isActive` flag)
  - Track last access time (`lastAccessedAt`)
  - Tokens are scoped to an organization
  - Support both `CUSTOMER` and `VENDOR` portal types via `type` field

### CP-002: Portal Invitation
- **Priority**: P0
- **Description**: Invite customers to their self-service portal via email
- **Acceptance Criteria**:
  - Admin/staff can send portal invitation from the customer contact detail page
  - System generates a unique, cryptographically secure token (minimum 64 characters)
  - Token is stored in `PortalAccess` with `type=CUSTOMER`, linked to the contact
  - Default expiry is 90 days from creation (configurable in organization settings)
  - Email is sent with a portal link: `{APP_URL}/portal/customer/{token}`
  - Email uses a professional HTML template with organization branding
  - If customer already has an active portal access, regenerate token and invalidate the old one
  - Log the invitation in `EmailLog` with `referenceType='portal_invitation'`

### CP-003: Token Verification
- **Priority**: P0
- **Description**: Verify portal access tokens before granting access
- **Acceptance Criteria**:
  - `GET /api/portal/customer/verify?token=xxx` validates the token
  - Return 200 with customer name and organization branding if valid
  - Return 401 if token is invalid, expired, or deactivated
  - Update `lastAccessedAt` on successful verification
  - Return organization logo URL and primary color for branding
  - Rate-limit verification endpoint to 10 requests per minute per IP

### CP-004: Customer Portal Dashboard
- **Priority**: P0
- **Description**: Overview page showing key account information
- **Acceptance Criteria**:
  - Display customer company name and contact info
  - Show summary cards: Outstanding Invoice Balance, Total Orders (this year), Last Payment Date/Amount, Account Credit Balance
  - List of overdue invoices with days overdue highlighted in red
  - List of recent orders (last 5) with status badges
  - Quick links to Orders, Invoices, Payments sections
  - Organization branding (logo, colors) in portal header

### CP-005: Customer Orders Page
- **Priority**: P0
- **Description**: List and view customer's sales orders
- **Acceptance Criteria**:
  - Display all sales orders for the customer, sorted by date descending
  - Show: order number, date, status (with color-coded badge), total amount, invoice status
  - Filter by status (All, Confirmed, Shipped, Delivered, Closed)
  - Filter by date range
  - Search by order number
  - Pagination (20 per page)
  - Click order to view full detail

### CP-006: Customer Order Detail
- **Priority**: P0
- **Description**: View individual sales order with full details
- **Acceptance Criteria**:
  - Display order header: order number, date, status, expected ship date
  - Display line items: item name, SKU, quantity, unit price, tax, line total
  - Display order totals: subtotal, discount, tax, shipping, grand total
  - Display shipping and billing addresses
  - Show linked invoices with status
  - Show notes/terms and conditions
  - "Accept Order" and "Reject Order" buttons for CONFIRMED orders (optional workflow)
  - Download order as PDF (reuse existing PDF generation)

### CP-007: Customer Order Accept/Reject
- **Priority**: P1
- **Description**: Allow customers to accept or reject confirmed orders
- **Acceptance Criteria**:
  - `POST /api/portal/customer/orders/:id/accept` with `action: 'accept' | 'reject'`
  - Only applicable to orders in CONFIRMED status
  - On accept: optionally log acceptance timestamp and source as "customer_portal"
  - On reject: require a rejection reason (text field)
  - On reject: notify the sales person via email (if email notifications enabled)
  - Update order notes with portal action record

### CP-008: Customer Invoices Page
- **Priority**: P0
- **Description**: List and view customer's invoices
- **Acceptance Criteria**:
  - Display all invoices for the customer, sorted by date descending
  - Show: invoice number, date, due date, status (color-coded), total, balance due
  - Highlight overdue invoices with red badge and days overdue count
  - Filter by status (All, Sent, Partially Paid, Paid, Overdue)
  - Filter by date range
  - Search by invoice number
  - Pagination (20 per page)
  - Click invoice for detail view

### CP-009: Customer Invoice Detail
- **Priority**: P0
- **Description**: View individual invoice with payment information
- **Acceptance Criteria**:
  - Display invoice header: number, date, due date, status, payment status
  - Display line items: description, quantity, rate, tax, amount
  - Display totals: subtotal, discount, tax, total, amount paid, balance due
  - Display billing address
  - Show payment history for this invoice (date, amount, method, reference)
  - "Download PDF" button (reuse existing invoice PDF generation)
  - "Pay Online" button (when payment gateway is configured) -- links to payment gateway flow
  - Show e-Invoice QR code if available

### CP-010: Customer Payments Page
- **Priority**: P0
- **Description**: View payment history
- **Acceptance Criteria**:
  - Display all payments made by this customer, sorted by date descending
  - Show: payment number, date, amount (MYR), payment method, reference, invoices applied to
  - Filter by date range
  - Filter by payment method
  - Search by payment number or reference
  - Pagination (20 per page)
  - Show total payments for the filtered period

### CP-011: Customer Profile Page
- **Priority**: P1
- **Description**: View and update customer contact information
- **Acceptance Criteria**:
  - Display current contact info: company name, display name, email, phone, mobile
  - Display billing and shipping addresses
  - Allow editing: email, phone, mobile, billing address, shipping address
  - Do NOT allow editing: company name, tax number, credit limit, payment terms
  - Changes are saved to the Contact model
  - Validation: email format, phone format (Malaysian: +60-xxx)
  - Show last updated timestamp

### CP-012: Portal Layout
- **Priority**: P0
- **Description**: Responsive portal layout separate from main app
- **Acceptance Criteria**:
  - Header: organization logo (left), customer name (right), logout/exit button
  - Navigation: horizontal nav bar (Dashboard, Orders, Invoices, Payments, Profile)
  - On mobile (< 768px): hamburger menu with slide-out navigation
  - Footer: organization name, "Powered by IMS Pro", support contact
  - Inherit organization primary color for header and accent elements
  - Portal pages use a clean, minimal design (no sidebar)
  - All portal pages are under `/portal/customer/[token]/...`
  - Token is stored in sessionStorage after initial verification
  - Redirect to verification error page if token becomes invalid

### CP-013: Portal Email Template
- **Priority**: P0
- **Description**: HTML email template for portal invitation
- **Acceptance Criteria**:
  - Professional HTML email with organization branding
  - Include: organization logo, company name
  - Body: "You have been invited to access your account portal"
  - Prominent "Access Portal" button with the portal link
  - Include portal link as plain text fallback
  - Mention expiry date: "This link expires on {date}"
  - Footer: organization contact information
  - Mobile-responsive email layout

### CP-014: Portal Security
- **Priority**: P0
- **Description**: Security measures for the portal
- **Acceptance Criteria**:
  - Tokens are generated using `crypto.randomBytes(48).toString('hex')` (96-char hex string)
  - All portal API endpoints validate the token from request headers (`X-Portal-Token`)
  - Portal APIs only return data belonging to the token's associated contact
  - Portal APIs are rate-limited (100 requests per minute per token)
  - No access to other customers' data, no admin endpoints
  - Token verification middleware for all `/api/portal/customer/*` routes
  - CORS configured to allow portal origin
  - CSP headers for portal pages

## Data Models

### PortalAccess (New Model)

```prisma
model PortalAccess {
  id             String          @id @default(cuid())
  contactId      String
  contact        Contact         @relation(fields: [contactId], references: [id], onDelete: Cascade)
  token          String          @unique
  type           PortalType
  isActive       Boolean         @default(true)
  lastAccessedAt DateTime?
  expiresAt      DateTime
  organizationId String
  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@index([contactId])
  @@index([token])
  @@index([organizationId])
  @@index([type, isActive])
}

enum PortalType {
  CUSTOMER
  VENDOR
}
```

### Schema Changes

Add to `Organization` model:
```prisma
portalAccesses   PortalAccess[]
```

Add to `Contact` model:
```prisma
portalAccesses   PortalAccess[]
```

Add to `EmailType` enum:
```prisma
PORTAL_INVITATION
```

## API Endpoints

### Portal Management (Authenticated - Main App)

```
POST   /api/portal/invite                          - Send portal invitation email
  Body: { contactId: string, type: 'CUSTOMER' | 'VENDOR', expiresInDays?: number }
  Response: { id: string, token: string, expiresAt: string }

GET    /api/portal/accesses                         - List all portal accesses
  Query: { type?: 'CUSTOMER' | 'VENDOR', isActive?: boolean, page?: number, limit?: number }
  Response: PaginatedResponse<PortalAccess>

PUT    /api/portal/accesses/:id/deactivate          - Deactivate a portal access
  Response: { success: true }

PUT    /api/portal/accesses/:id/regenerate           - Regenerate token for existing access
  Response: { id: string, token: string, expiresAt: string }
```

### Customer Portal (Token-authenticated)

All endpoints require `X-Portal-Token` header.

```
GET    /api/portal/customer/verify?token=xxx         - Verify token and get branding info
  Response: {
    valid: true,
    customer: { id, companyName, displayName, email },
    organization: { name, logoUrl, primaryColor, phone, email }
  }

GET    /api/portal/customer/dashboard                - Get dashboard summary
  Response: {
    outstandingBalance: number,
    totalOrdersThisYear: number,
    lastPayment: { date, amount } | null,
    creditBalance: number,
    overdueInvoices: Invoice[],
    recentOrders: SalesOrder[]
  }

GET    /api/portal/customer/orders                   - List customer's sales orders
  Query: { status?, dateFrom?, dateTo?, search?, page?, limit? }
  Response: PaginatedResponse<SalesOrder>

GET    /api/portal/customer/orders/:id               - Get order detail
  Response: SalesOrder (with items, addresses, linked invoices)

POST   /api/portal/customer/orders/:id/accept        - Accept or reject order
  Body: { action: 'accept' | 'reject', reason?: string }
  Response: { success: true, order: SalesOrder }

GET    /api/portal/customer/orders/:id/pdf           - Download order PDF
  Response: PDF file stream

GET    /api/portal/customer/invoices                 - List customer's invoices
  Query: { status?, dateFrom?, dateTo?, search?, page?, limit? }
  Response: PaginatedResponse<Invoice>

GET    /api/portal/customer/invoices/:id             - Get invoice detail
  Response: Invoice (with items, payments, e-invoice info)

GET    /api/portal/customer/invoices/:id/pdf         - Download invoice PDF
  Response: PDF file stream

GET    /api/portal/customer/payments                 - List customer's payments
  Query: { dateFrom?, dateTo?, method?, search?, page?, limit? }
  Response: PaginatedResponse<Payment>

GET    /api/portal/customer/profile                  - Get customer profile
  Response: Contact (with addresses)

PUT    /api/portal/customer/profile                  - Update customer profile
  Body: { email?, phone?, mobile?, billingAddress?, shippingAddress? }
  Response: Contact (updated)
```

## Frontend Pages & Components

### Route Structure (apps/web)

```
/portal/customer/[token]                 - Token verification + redirect to dashboard
/portal/customer/[token]/dashboard       - Dashboard
/portal/customer/[token]/orders          - Orders list
/portal/customer/[token]/orders/[id]     - Order detail
/portal/customer/[token]/invoices        - Invoices list
/portal/customer/[token]/invoices/[id]   - Invoice detail
/portal/customer/[token]/payments        - Payments list
/portal/customer/[token]/profile         - Profile edit
```

### PortalLayout Component

```tsx
// apps/web/src/components/portal/PortalLayout.tsx

interface PortalLayoutProps {
  children: React.ReactNode;
  organizationName: string;
  organizationLogo?: string;
  primaryColor?: string;
  customerName: string;
  token: string;
}

// Layout structure:
// - Fixed header with logo, nav links, customer name
// - Horizontal nav: Dashboard | Orders | Invoices | Payments | Profile
// - Main content area with max-width container
// - Footer with org info
// - Mobile: hamburger menu with Ant Design Drawer
// - Ant Design ConfigProvider wrapping with dynamic primaryColor
```

### Portal Dashboard Page

```tsx
// apps/web/src/app/portal/customer/[token]/dashboard/page.tsx

// Components used:
// - Ant Design: Row, Col, Card, Statistic, Table, Tag, List, Typography
// - 4 summary cards: Outstanding Balance, Orders This Year, Last Payment, Credit Balance
// - Overdue invoices table: invoiceNumber, dueDate, daysOverdue (Tag danger), balance
// - Recent orders list: orderNumber, date, status (Tag), total
// - Quick action links to other sections
```

### Orders List Page

```tsx
// apps/web/src/app/portal/customer/[token]/orders/page.tsx

// Components:
// - Ant Design: Table, Input.Search, Select, DatePicker.RangePicker, Tag, Space, Button
// - Filters row: status select, date range picker, search input
// - Table columns: Order #, Date, Status (Tag), Total (formatted MYR), Invoice Status
// - Click row to navigate to order detail
// - Pagination component
```

### Order Detail Page

```tsx
// apps/web/src/app/portal/customer/[token]/orders/[id]/page.tsx

// Components:
// - Ant Design: Descriptions, Table, Tag, Button, Card, Timeline, Modal, Input.TextArea
// - Order header card with Descriptions: number, date, status, ship date
// - Line items table: Item, SKU, Qty, Unit Price, Tax, Total
// - Order totals section
// - Addresses: shipping and billing in side-by-side cards
// - Linked invoices table
// - Accept/Reject buttons (for CONFIRMED orders) with confirmation modal
// - Download PDF button
```

### Invoices List Page

```tsx
// apps/web/src/app/portal/customer/[token]/invoices/page.tsx

// Components:
// - Ant Design: Table, Input.Search, Select, DatePicker.RangePicker, Tag, Button
// - Overdue badge: red tag with "{N} days overdue"
// - Filters: status, date range, search
// - Table columns: Invoice #, Date, Due Date, Status, Total, Balance Due
// - Balance Due column highlighted when overdue
// - Click to view detail
```

### Invoice Detail Page

```tsx
// apps/web/src/app/portal/customer/[token]/invoices/[id]/page.tsx

// Components:
// - Ant Design: Descriptions, Table, Tag, Button, Card, Divider, QRCode
// - Invoice header: number, date, due date, status, payment status
// - Line items table
// - Totals breakdown
// - Payment history table: date, amount, method, reference
// - e-Invoice QR code display (if available)
// - "Download PDF" button
// - "Pay Online" button (if payment gateway configured) - navigates to payment flow
```

### Payments List Page

```tsx
// apps/web/src/app/portal/customer/[token]/payments/page.tsx

// Components:
// - Ant Design: Table, DatePicker.RangePicker, Select, Input.Search, Statistic
// - Period total statistic at top
// - Filters: date range, payment method, search
// - Table columns: Payment #, Date, Amount, Method, Reference, Applied To (invoice links)
```

### Profile Page

```tsx
// apps/web/src/app/portal/customer/[token]/profile/page.tsx

// Components:
// - Ant Design: Form, Input, Card, Button, Divider, message
// - Contact info card: email, phone, mobile (editable)
// - Billing address card: address fields (editable)
// - Shipping address card: address fields (editable)
// - Read-only display: company name, tax number, credit limit, payment terms
// - Save button with loading state
// - Form validation for email and phone formats
```

### Shared Portal Components

```tsx
// PortalHeader - Logo, nav, customer name, mobile menu toggle
// PortalFooter - Organization info, powered by
// PortalBreadcrumb - Simple breadcrumb for navigation context
// PortalStatusTag - Consistent status badge rendering
// PortalEmptyState - Empty state for lists with no data
// PortalErrorPage - Token expired/invalid error page
// PortalLoadingSkeleton - Loading skeletons for each page type
```

## Business Logic

### Token Generation Flow

1. Staff clicks "Invite to Portal" on customer contact page
2. System checks for existing active `PortalAccess` for this contact
3. If exists: deactivate old token, create new one
4. Generate cryptographically secure token
5. Create `PortalAccess` record with expiry date
6. Send invitation email via `EmailService`
7. Log email in `EmailLog`

### Portal Access Flow

1. Customer clicks portal link in email
2. Frontend extracts token from URL path
3. Frontend calls `GET /api/portal/customer/verify?token=xxx`
4. If valid: store token in sessionStorage, load branding, redirect to dashboard
5. If invalid: display error page with "Contact your supplier" message
6. All subsequent API calls include `X-Portal-Token` header
7. If any API returns 401: clear sessionStorage, show re-verification prompt

### Data Scoping

- All portal queries filter by `contactId` from the verified `PortalAccess` record
- Sales orders: `WHERE customerId = contactId AND organizationId = orgId`
- Invoices: `WHERE customerId = contactId AND organizationId = orgId`
- Payments: `WHERE customerId = contactId AND organizationId = orgId`
- Profile updates: only update the specific `Contact` record

## Dependencies

```json
{
  "crypto": "built-in",
  "nodemailer": "^6.9.0"
}
```

## Environment Variables

```env
# Portal Configuration
PORTAL_TOKEN_EXPIRY_DAYS=90
PORTAL_BASE_URL=https://your-domain.com/portal
PORTAL_RATE_LIMIT_PER_MINUTE=100
```
