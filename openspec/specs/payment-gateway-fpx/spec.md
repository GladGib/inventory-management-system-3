# FPX Payment Gateway Integration

## Overview
Integration with Malaysia's FPX (Financial Process Exchange) online banking payment system through a payment aggregator (Revenue Monster, Billplz, or iPay88). FPX allows customers to pay invoices directly from their bank accounts. This spec covers the shared payment gateway infrastructure (models, configuration, webhook handling) and the FPX-specific implementation.

## Requirements

### FPX-001: Payment Gateway Configuration Model
- **Priority**: P0
- **Description**: Shared model for storing payment gateway credentials per organization
- **Acceptance Criteria**:
  - Create `PaymentGatewayConfig` model to store provider credentials
  - Support multiple providers: FPX, DUITNOW, GRABPAY, TNG
  - Store merchant ID and secret key (encrypted at rest)
  - Toggle sandbox/production mode per provider
  - Toggle active/inactive per provider
  - Each organization can have one config per provider
  - Secret key encrypted using AES-256 before storage

### FPX-002: Online Payment Model
- **Priority**: P0
- **Description**: Shared model for tracking all online payment transactions
- **Acceptance Criteria**:
  - Create `OnlinePayment` model to track payment attempts
  - Link to invoice being paid
  - Track provider and provider-specific transaction ID
  - Status workflow: PENDING -> SUCCESS / FAILED / EXPIRED
  - Store callback data as JSON for audit/debugging
  - Store redirect URL for customer return
  - Record timestamps: created, completed
  - Amount and currency (MYR)

### FPX-003: Payment Gateway Settings Page
- **Priority**: P0
- **Description**: Admin page to configure payment gateways
- **Acceptance Criteria**:
  - Settings page at `/settings/payment-gateways`
  - Card per provider (FPX, DuitNow, GrabPay, TNG)
  - Each card shows: provider name, status (active/inactive toggle), environment (sandbox/production)
  - Expandable configuration form: merchant ID, secret key (masked input), webhook URL (read-only, auto-generated)
  - "Test Connection" button per provider
  - Save button with validation
  - Display webhook URL that the merchant must configure in their aggregator dashboard
  - Show last successful transaction date per provider

### FPX-004: FPX Payment Initiation
- **Priority**: P0
- **Description**: Initiate an FPX payment for an invoice
- **Acceptance Criteria**:
  - `POST /api/payments/online/initiate` with `{ invoiceId, provider: 'FPX', bankCode?: string }`
  - Validate invoice exists, belongs to organization, and has outstanding balance
  - Create `OnlinePayment` record with status PENDING
  - Call payment aggregator API to create FPX payment session
  - Return bank selection list (if bankCode not provided) or redirect URL
  - Payment amount = invoice balance (or specified partial amount)
  - Set timeout: FPX transactions expire after 60 minutes (per FPX specification)
  - Store aggregator's transaction reference in `providerTransactionId`

### FPX-005: FPX Bank List
- **Priority**: P0
- **Description**: Retrieve list of participating FPX banks
- **Acceptance Criteria**:
  - `GET /api/payments/online/banks`
  - Return list of FPX participating banks with: bankCode, bankName, status (online/offline)
  - Cache bank list for 5 minutes (banks rarely change)
  - Separate individual and corporate bank lists
  - Include bank logos if available from aggregator

### FPX-006: FPX Callback/Webhook Handler
- **Priority**: P0
- **Description**: Handle FPX payment result notification from aggregator
- **Acceptance Criteria**:
  - `POST /api/payments/online/callback` receives webhook from payment aggregator
  - Verify webhook signature using merchant secret key
  - Look up `OnlinePayment` by provider transaction ID
  - Update status based on FPX response code:
    - `00` = Success -> status = SUCCESS
    - Other codes = Failed -> status = FAILED with error description
  - On SUCCESS: auto-create `Payment` record and `PaymentAllocation`
  - On SUCCESS: update invoice `amountPaid`, `balance`, and `paymentStatus`
  - On SUCCESS: update invoice status to PARTIALLY_PAID or PAID
  - Log full callback data in `callbackData` JSON field
  - Return 200 OK immediately to aggregator (process asynchronously if needed)
  - Idempotent: do not create duplicate payments if callback received multiple times

### FPX-007: Payment Status Check
- **Priority**: P0
- **Description**: Check status of an online payment
- **Acceptance Criteria**:
  - `GET /api/payments/online/:id/status`
  - Return current status, provider transaction ID, timestamps
  - If status is PENDING and created > 60 minutes ago, mark as EXPIRED
  - Used by frontend to poll for payment completion after redirect

### FPX-008: FPX Bank Selector Modal
- **Priority**: P0
- **Description**: Frontend component for selecting FPX bank
- **Acceptance Criteria**:
  - Modal displays list of FPX banks grouped by: Individual (B2C) and Corporate (B2B)
  - Each bank shown with logo and name
  - Bank status indicator (online/offline)
  - Disabled selection for offline banks
  - Search/filter banks by name
  - On selection: initiate payment and redirect to bank's login page
  - Loading state while initiating payment

### FPX-009: Pay Online Button
- **Priority**: P0
- **Description**: "Pay Online" button on invoice detail (customer portal)
- **Acceptance Criteria**:
  - Displayed on invoice detail page in customer portal
  - Only shown when: invoice has outstanding balance AND at least one payment gateway is active
  - Shows available payment methods (FPX, DuitNow, GrabPay, TNG) based on active configs
  - Clicking FPX opens bank selector modal
  - Clicking others opens respective payment flow

### FPX-010: Payment Status Page
- **Priority**: P0
- **Description**: Page shown after payment redirect
- **Acceptance Criteria**:
  - Route: `/portal/customer/[token]/payment-status/[paymentId]`
  - Polls `GET /api/payments/online/:id/status` every 3 seconds
  - Displays:
    - PENDING: spinner with "Processing your payment..."
    - SUCCESS: green checkmark, "Payment successful!", amount, reference number, link back to invoice
    - FAILED: red X, "Payment failed", error message, "Try Again" button
    - EXPIRED: warning icon, "Payment session expired", "Try Again" button
  - Auto-stop polling after SUCCESS, FAILED, or EXPIRED
  - Maximum polling duration: 5 minutes, then show timeout message

### FPX-011: Auto-Reconciliation
- **Priority**: P0
- **Description**: Automatically reconcile successful FPX payments
- **Acceptance Criteria**:
  - On successful FPX callback:
    1. Create `Payment` record with `paymentMethod = FPX`
    2. Create `PaymentAllocation` linking payment to invoice
    3. Update `Invoice.amountPaid` = previous + payment amount
    4. Update `Invoice.balance` = total - amountPaid
    5. Update `Invoice.paymentStatus`: PAID if balance = 0, PARTIALLY_PAID if balance > 0
    6. Set `Payment.referenceNumber` to FPX transaction reference
  - All operations in a database transaction
  - If any step fails, log error but do not retry automatically (manual reconciliation needed)

### FPX-012: Webhook Signature Verification
- **Priority**: P0
- **Description**: Verify authenticity of payment webhooks
- **Acceptance Criteria**:
  - Each aggregator has a specific signature scheme:
    - Revenue Monster: HMAC-SHA256 with shared secret
    - Billplz: X-Signature header with SHA-256 hash
    - iPay88: Signature field in callback with SHA256
  - Reject webhooks with invalid signatures (return 401)
  - Log all webhook attempts (valid and invalid) for security audit
  - Support configurable signature verification per aggregator

## Data Models

### PaymentGatewayConfig (New Model)

```prisma
model PaymentGatewayConfig {
  id             String          @id @default(cuid())
  provider       PaymentProvider
  merchantId     String
  secretKey      String          // Encrypted with AES-256
  apiKey         String?         // Some providers use API key + secret
  callbackUrl    String?         // Auto-generated webhook URL
  isActive       Boolean         @default(false)
  isSandbox      Boolean         @default(true)
  metadata       Json            @default("{}") // Provider-specific config
  organizationId String
  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@unique([organizationId, provider])
  @@index([organizationId])
  @@index([provider])
}

enum PaymentProvider {
  FPX
  DUITNOW
  GRABPAY
  TNG
}
```

### OnlinePayment (New Model)

```prisma
model OnlinePayment {
  id                    String              @id @default(cuid())
  invoiceId             String
  invoice               Invoice             @relation(fields: [invoiceId], references: [id])
  amount                Decimal             @db.Decimal(15, 2)
  currency              String              @default("MYR")
  provider              PaymentProvider
  providerTransactionId String?
  status                OnlinePaymentStatus @default(PENDING)
  redirectUrl           String?             // URL to redirect customer to
  returnUrl             String?             // URL customer returns to after payment
  callbackData          Json?               // Raw webhook/callback data
  errorMessage          String?
  paymentId             String?             // Link to Payment record after reconciliation
  payment               Payment?            @relation(fields: [paymentId], references: [id])
  organizationId        String
  organization          Organization        @relation(fields: [organizationId], references: [id])
  completedAt           DateTime?
  expiresAt             DateTime?
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  @@index([invoiceId])
  @@index([providerTransactionId])
  @@index([organizationId])
  @@index([status])
}

enum OnlinePaymentStatus {
  PENDING
  SUCCESS
  FAILED
  EXPIRED
}
```

### Schema Changes

Add to `Organization` model:
```prisma
paymentGatewayConfigs PaymentGatewayConfig[]
onlinePayments        OnlinePayment[]
```

Add to `Invoice` model:
```prisma
onlinePayments OnlinePayment[]
```

Add to `Payment` model:
```prisma
onlinePayment OnlinePayment?
```

## API Endpoints

### Payment Gateway Configuration (Authenticated - Main App)

```
GET    /api/settings/payment-gateways                    - List all gateway configs
  Response: PaymentGatewayConfig[] (secretKey masked)

POST   /api/settings/payment-gateways                    - Create/update gateway config
  Body: { provider, merchantId, secretKey, apiKey?, isSandbox, isActive }
  Response: PaymentGatewayConfig

PUT    /api/settings/payment-gateways/:id                - Update gateway config
  Body: { merchantId?, secretKey?, apiKey?, isSandbox?, isActive? }
  Response: PaymentGatewayConfig

DELETE /api/settings/payment-gateways/:id                - Delete gateway config
  Response: { success: true }

POST   /api/settings/payment-gateways/:id/test           - Test gateway connection
  Response: { success: boolean, message: string }
```

### Online Payments (Mixed auth - some portal, some main app)

```
POST   /api/payments/online/initiate                     - Initiate online payment
  Body: { invoiceId, provider: 'FPX', amount?: number, bankCode?: string }
  Auth: Portal token OR authenticated user
  Response: {
    onlinePaymentId: string,
    redirectUrl?: string,        // If bank selected, redirect here
    banks?: FPXBank[],           // If no bank selected, show selector
    expiresAt: string
  }

POST   /api/payments/online/callback                     - Webhook from aggregator
  Auth: Signature verification (no user auth)
  Body: Provider-specific callback payload
  Response: { received: true }

GET    /api/payments/online/:id/status                   - Check payment status
  Auth: Portal token OR authenticated user
  Response: {
    id: string,
    status: OnlinePaymentStatus,
    amount: number,
    provider: string,
    providerTransactionId?: string,
    completedAt?: string,
    errorMessage?: string
  }

GET    /api/payments/online/banks                        - Get FPX bank list
  Auth: Portal token OR authenticated user
  Response: {
    individual: { bankCode: string, bankName: string, status: 'online' | 'offline', logoUrl?: string }[],
    corporate: { bankCode: string, bankName: string, status: 'online' | 'offline', logoUrl?: string }[]
  }

GET    /api/payments/online                              - List online payments (admin)
  Auth: Authenticated user
  Query: { invoiceId?, provider?, status?, dateFrom?, dateTo?, page?, limit? }
  Response: PaginatedResponse<OnlinePayment>
```

## Frontend Pages & Components

### Payment Gateway Settings Page

```tsx
// apps/web/src/app/(dashboard)/settings/payment-gateways/page.tsx

// Components:
// - Ant Design: Card, Form, Input, Switch, Select, Button, Tag, Space, Collapse, message
// - Page header: "Payment Gateway Settings"
// - Card per provider:
//   - Header: provider logo + name, Active/Inactive tag
//   - Toggle switch for isActive
//   - Environment selector: Sandbox / Production
//   - Collapsible config form:
//     - Merchant ID input
//     - Secret Key input (password type with reveal toggle)
//     - API Key input (if applicable)
//     - Webhook URL (read-only, copyable): /api/payments/online/callback?provider=FPX
//   - "Test Connection" button
//   - "Save" button
//   - Last transaction date/status display
```

### FPX Bank Selector Modal

```tsx
// apps/web/src/components/payments/FPXBankSelector.tsx

interface FPXBankSelectorProps {
  invoiceId: string;
  amount: number;
  visible: boolean;
  onClose: () => void;
  onPaymentInitiated: (paymentId: string) => void;
  token?: string; // Portal token for portal context
}

// Components:
// - Ant Design: Modal, List, Avatar, Input.Search, Tabs, Spin, Tag, Typography
// - Two tabs: "Individual Banking" and "Corporate Banking"
// - Each bank as a list item with: bank logo, bank name, online/offline status
// - Search input to filter banks by name
// - Offline banks shown but disabled with "Offline" tag
// - Clicking online bank:
//   1. Show loading overlay
//   2. Call POST /api/payments/online/initiate with bankCode
//   3. Redirect to bank URL (window.location.href = redirectUrl)
// - Amount displayed prominently at top of modal
```

### Payment Status Page

```tsx
// apps/web/src/app/portal/customer/[token]/payment-status/[paymentId]/page.tsx

// Components:
// - Ant Design: Result, Spin, Button, Descriptions, Typography
// - Polling logic with useEffect + setInterval (3s)
// - States:
//   - PENDING: <Spin> with "Processing your payment..." text
//   - SUCCESS: <Result status="success"> with amount, reference, "Back to Invoice" button
//   - FAILED: <Result status="error"> with error message, "Try Again" button
//   - EXPIRED: <Result status="warning"> with "Session expired", "Try Again" button
// - Max poll duration: 5 minutes timeout
// - Cleanup interval on unmount
```

### PayOnlineButton Component

```tsx
// apps/web/src/components/payments/PayOnlineButton.tsx

interface PayOnlineButtonProps {
  invoiceId: string;
  balance: number;
  organizationId: string;
  token?: string; // Portal token
}

// Components:
// - Ant Design: Button, Dropdown, Menu
// - Fetches active payment gateways for the organization
// - If only one provider active: single button with provider name
// - If multiple active: dropdown button with provider options
// - Clicking provider opens respective modal/flow:
//   - FPX -> FPXBankSelector modal
//   - DuitNow -> DuitNowQR modal
//   - GrabPay -> redirect flow
//   - TNG -> redirect/deeplink flow
// - Hidden if no gateways are active
```

## Business Logic

### FPX Payment Flow

1. Customer clicks "Pay Online" on invoice in customer portal
2. Selects "FPX Online Banking" as payment method
3. FPX Bank Selector modal opens with bank list
4. Customer selects their bank
5. System calls `POST /api/payments/online/initiate` with invoiceId and bankCode
6. Backend creates `OnlinePayment` record (PENDING)
7. Backend calls aggregator API to create FPX transaction
8. Backend returns redirect URL
9. Frontend redirects customer to bank's login page
10. Customer authenticates with bank and approves payment
11. Bank redirects customer back to payment status page
12. Aggregator sends webhook to callback URL
13. Backend verifies webhook signature
14. Backend updates `OnlinePayment` status
15. If SUCCESS: auto-create Payment + PaymentAllocation, update Invoice
16. Payment status page shows result to customer

### Aggregator Integration Pattern

```typescript
// apps/api/src/modules/payments/providers/fpx.provider.ts

interface FPXProvider {
  createPayment(params: {
    amount: number;
    invoiceNumber: string;
    customerEmail: string;
    bankCode: string;
    callbackUrl: string;
    returnUrl: string;
  }): Promise<{ transactionId: string; redirectUrl: string }>;

  verifyCallback(payload: any, signature: string): boolean;

  getBankList(): Promise<FPXBank[]>;

  checkStatus(transactionId: string): Promise<{
    status: 'success' | 'failed' | 'pending';
    responseCode: string;
    transactionRef: string;
  }>;
}
```

### Secret Key Encryption

```typescript
// apps/api/src/modules/payments/utils/encryption.ts

// Use AES-256-GCM for encrypting secret keys
// Encryption key stored in environment variable: PAYMENT_ENCRYPTION_KEY
// encrypt(plaintext: string): string  -- returns base64(iv + ciphertext + authTag)
// decrypt(ciphertext: string): string -- returns plaintext
```

## Environment Variables

```env
# Payment Gateway
PAYMENT_ENCRYPTION_KEY=your-32-byte-hex-key
PAYMENT_CALLBACK_BASE_URL=https://your-domain.com/api/payments/online/callback

# FPX Provider (Revenue Monster example)
FPX_AGGREGATOR=revenue_monster  # revenue_monster | billplz | ipay88
```

## Dependencies

```json
{
  "axios": "^1.6.0",
  "crypto": "built-in"
}
```
