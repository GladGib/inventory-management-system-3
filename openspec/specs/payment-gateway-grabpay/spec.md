# GrabPay eWallet Integration

## Overview
Integration with GrabPay eWallet, allowing customers to pay invoices using their GrabPay balance via the Grab app. This uses the Grab Partner API (OAuth 2.0 flow) where customers are redirected to the Grab app to authorize payment. This spec uses the shared `PaymentGatewayConfig` and `OnlinePayment` models defined in the FPX payment gateway spec.

## Requirements

### GP-001: GrabPay Payment Initiation
- **Priority**: P1
- **Description**: Initiate a GrabPay payment for an invoice
- **Acceptance Criteria**:
  - `POST /api/payments/online/grabpay/initiate`
  - Input: `{ invoiceId, amount?: number }`
  - Create `OnlinePayment` record with `provider=GRABPAY`, status PENDING
  - Call Grab Partner API to create a payment charge
  - Return OAuth redirect URL (Grab app authorization page)
  - Payment amount in MYR (minimum RM 0.10)
  - Transaction description includes invoice number
  - Set `OnlinePayment.redirectUrl` to Grab authorization URL
  - Set `OnlinePayment.returnUrl` to portal payment status page
  - GrabPay transactions expire after 5 minutes (Grab API default)

### GP-002: GrabPay OAuth Callback
- **Priority**: P1
- **Description**: Handle return URL after customer authorizes in Grab app
- **Acceptance Criteria**:
  - `GET /api/payments/online/grabpay/callback` receives redirect from Grab
  - Query params include: authorization code, state (containing onlinePaymentId)
  - Exchange authorization code for payment confirmation via Grab API
  - On success: complete the charge via Grab Partner API
  - Update `OnlinePayment` status based on charge result
  - Redirect customer to payment status page in portal

### GP-003: GrabPay Server Webhook
- **Priority**: P1
- **Description**: Handle server-to-server payment notification from Grab
- **Acceptance Criteria**:
  - `POST /api/payments/online/grabpay/webhook` receives notification
  - Verify webhook signature using Grab Partner secret
  - Update `OnlinePayment` status
  - On SUCCESS: auto-reconcile (create Payment + PaymentAllocation, update Invoice)
  - Idempotent: handle duplicate notifications
  - Log full webhook payload
  - This is the authoritative payment confirmation (not the redirect callback)

### GP-004: GrabPay Button Component
- **Priority**: P1
- **Description**: GrabPay branded payment button for customer portal
- **Acceptance Criteria**:
  - Green button with Grab logo and "Pay with GrabPay" text
  - Follow Grab brand guidelines for button styling:
    - Background: #00B14F (Grab green)
    - Text: white
    - Grab logo on the left
    - Rounded corners
    - Minimum height: 44px
  - Loading state while initiating payment
  - On click:
    1. Show loading overlay
    2. Call `POST /api/payments/online/grabpay/initiate`
    3. Redirect to Grab authorization URL
  - Disabled state with tooltip when GrabPay is not configured

### GP-005: GrabPay Configuration
- **Priority**: P1
- **Description**: GrabPay-specific configuration in payment gateway settings
- **Acceptance Criteria**:
  - Uses shared `PaymentGatewayConfig` with `provider=GRABPAY`
  - Required fields: Partner ID (merchantId), Partner Secret (secretKey), Client ID (apiKey)
  - `metadata` JSON stores: `{ countryCode: 'MY', currency: 'MYR' }`
  - Sandbox and production environments supported
  - Sandbox URL: `https://partner-gw.stg-myteksi.com`
  - Production URL: `https://partner-gw.grab.com`
  - "Test Connection" validates credentials with Grab API health check

### GP-006: GrabPay Redirect Flow Handling
- **Priority**: P1
- **Description**: Handle the complete OAuth redirect lifecycle
- **Acceptance Criteria**:
  - Before redirect: store `onlinePaymentId` in sessionStorage
  - State parameter in OAuth contains: onlinePaymentId + CSRF token
  - After Grab redirect back:
    - Backend extracts authorization code from query params
    - Validates state parameter (CSRF protection)
    - Calls Grab API to complete charge
    - Redirects to payment status page
  - If user cancels in Grab app: redirect to payment status page, status shows FAILED
  - If Grab app is not installed (mobile): Grab web fallback flow
  - Desktop: redirect to Grab web payment page

### GP-007: GrabPay Refund Support
- **Priority**: P2
- **Description**: Support refunding GrabPay payments
- **Acceptance Criteria**:
  - `POST /api/payments/online/grabpay/refund`
  - Body: `{ onlinePaymentId, amount?: number, reason: string }`
  - Call Grab Partner API refund endpoint
  - Full or partial refund support
  - Update `OnlinePayment` record with refund status
  - Create corresponding refund record in the system
  - Refunds processed within Grab's SLA (typically instant)

## API Endpoints

### GrabPay-Specific Endpoints

```
POST   /api/payments/online/grabpay/initiate             - Initiate GrabPay payment
  Auth: Portal token OR authenticated user
  Body: { invoiceId: string, amount?: number }
  Response: {
    onlinePaymentId: string,
    redirectUrl: string,         // Grab OAuth authorization URL
    expiresAt: string
  }

GET    /api/payments/online/grabpay/callback              - OAuth callback (redirect from Grab)
  Query: { code: string, state: string }
  Response: 302 Redirect to payment status page

POST   /api/payments/online/grabpay/webhook               - Server-to-server notification
  Auth: Grab signature verification
  Body: Grab webhook payload
  Response: { received: true }

POST   /api/payments/online/grabpay/refund                - Refund GrabPay payment
  Auth: Authenticated user (admin/manager)
  Body: { onlinePaymentId: string, amount?: number, reason: string }
  Response: {
    success: boolean,
    refundId: string,
    amount: number,
    status: string
  }
```

Shared endpoints from FPX spec:
```
GET    /api/payments/online/:id/status                   - Poll payment status
```

## Frontend Components

### GrabPayButton Component

```tsx
// apps/web/src/components/payments/GrabPayButton.tsx

interface GrabPayButtonProps {
  invoiceId: string;
  amount: number;
  onPaymentInitiated?: (paymentId: string) => void;
  token?: string; // Portal token
  disabled?: boolean;
}

// Rendering:
// - Custom styled Ant Design Button
// - Grab green background (#00B14F), white text
// - Grab logo (SVG) on the left
// - "Pay with GrabPay" text
// - Loading spinner overlay while initiating
// - On click:
//   1. Call POST /api/payments/online/grabpay/initiate
//   2. Store onlinePaymentId in sessionStorage
//   3. window.location.href = redirectUrl (leave current page)
// - After payment (redirect back): payment status page handles result
```

### GrabPay in PayOnlineButton Dropdown

```tsx
// Integration with the shared PayOnlineButton component:
// - GrabPay appears as a menu item in the payment method dropdown
// - Shows Grab logo + "GrabPay" text
// - Clicking initiates the redirect flow directly (no modal needed)
// - Distinct from FPX (modal) and DuitNow (modal) flows
```

## Business Logic

### GrabPay Payment Flow (OAuth 2.0)

1. Customer clicks "Pay with GrabPay" on invoice in portal
2. Frontend calls `POST /api/payments/online/grabpay/initiate`
3. Backend creates `OnlinePayment` (PENDING)
4. Backend calls Grab Partner API: `POST /grabpay/partner/v2/charge/init`
   - Request includes: partnerTxID, amount, currency, description, returnUrl
5. Grab API returns: `partnerTxID`, `request` (OAuth URL)
6. Backend stores Grab's reference, returns redirect URL
7. Frontend redirects customer to Grab OAuth URL
8. Customer authorizes payment in Grab app or web
9. Grab redirects to `GET /api/payments/online/grabpay/callback?code=xxx&state=yyy`
10. Backend exchanges code: `POST /grabpay/partner/v2/charge/complete`
11. Grab completes the charge
12. Backend redirects customer to payment status page
13. Grab sends webhook notification (authoritative)
14. Backend processes webhook, reconciles payment

### Grab Partner API Integration

```typescript
// apps/api/src/modules/payments/providers/grabpay.provider.ts

interface GrabPayProvider {
  initCharge(params: {
    partnerTxID: string;      // Unique transaction ID (use OnlinePayment.id)
    amount: number;            // In cents (e.g., 1000 = RM 10.00)
    currency: string;          // 'MYR'
    description: string;       // 'Invoice INV-000001'
    returnUrl: string;         // Callback URL
  }): Promise<{
    partnerTxID: string;
    request: string;           // OAuth authorization URL
  }>;

  completeCharge(params: {
    partnerTxID: string;
    accessToken: string;       // From OAuth code exchange
  }): Promise<{
    txID: string;              // Grab transaction ID
    status: string;            // 'success' | 'failed'
    description: string;
  }>;

  getOAuthToken(code: string): Promise<{
    accessToken: string;
    tokenType: string;
    expiresIn: number;
  }>;

  verifyWebhook(payload: any, signature: string): boolean;

  refund(params: {
    partnerTxID: string;
    originTxID: string;
    amount: number;
    currency: string;
    reason: string;
  }): Promise<{
    txID: string;
    status: string;
  }>;
}
```

### GrabPay API Authentication

- Partner-level authentication uses HMAC-SHA256
- Request signing: `HMAC-SHA256(partnerSecret, requestBody)`
- Include headers: `Date`, `Content-Type`, `Authorization`
- Authorization format: `Bearer <partnerID>:<signature>:<nonce>:<timestamp>`

### Error Handling

- Grab app not installed: Grab web fallback is used automatically
- User cancels authorization: redirect to callback with error code
- Insufficient GrabPay balance: Grab handles this in-app, returns failure
- Network timeout: `OnlinePayment` stays PENDING, webhook will eventually arrive
- Duplicate webhook: idempotent processing (check if already reconciled)

## Environment Variables

```env
# GrabPay Configuration (stored in PaymentGatewayConfig, these are fallbacks)
GRABPAY_PARTNER_ID=your-partner-id
GRABPAY_PARTNER_SECRET=your-partner-secret
GRABPAY_CLIENT_ID=your-client-id
GRABPAY_ENVIRONMENT=sandbox  # sandbox | production
GRABPAY_SANDBOX_URL=https://partner-gw.stg-myteksi.com
GRABPAY_PRODUCTION_URL=https://partner-gw.grab.com
```

## Dependencies

```json
{
  "axios": "^1.6.0",
  "crypto": "built-in"
}
```

## Grab Brand Guidelines

- Green: #00B14F
- White: #FFFFFF
- Minimum button size: 44px height
- Grab logo must be displayed as provided (no alterations)
- "GrabPay" must be written as one word with capital G and P
- Button text: "Pay with GrabPay"
- Logo SVG asset stored in: `apps/web/public/images/payment-providers/grabpay-logo.svg`
