# Touch 'n Go eWallet Integration

## Overview
Integration with Touch 'n Go (TNG) eWallet, allowing customers to pay invoices using their TNG eWallet balance. On mobile devices, the integration uses deep links to open the TNG app directly. On desktop, a QR code or redirect flow is used. This spec uses the shared `PaymentGatewayConfig` and `OnlinePayment` models defined in the FPX payment gateway spec.

## Requirements

### TNG-001: TNG Payment Initiation
- **Priority**: P1
- **Description**: Initiate a Touch 'n Go eWallet payment for an invoice
- **Acceptance Criteria**:
  - `POST /api/payments/online/tng/initiate`
  - Input: `{ invoiceId, amount?: number, platform?: 'mobile' | 'desktop' }`
  - Create `OnlinePayment` record with `provider=TNG`, status PENDING
  - Call TNG eWallet Open API to create payment request
  - If mobile: return TNG app deep link URL (`tngd://...` or universal link)
  - If desktop: return redirect URL to TNG web payment page
  - Payment amount in MYR (minimum RM 0.10, maximum per TNG transaction limit)
  - Transaction description includes invoice number
  - TNG transactions expire after 15 minutes (default)

### TNG-002: TNG Callback Handler
- **Priority**: P1
- **Description**: Handle payment notification webhook from TNG
- **Acceptance Criteria**:
  - `POST /api/payments/online/tng/callback` receives webhook from TNG/aggregator
  - Verify webhook signature
  - Look up `OnlinePayment` by provider transaction ID
  - Update status based on TNG response
  - On SUCCESS: auto-reconcile (create Payment + PaymentAllocation, update Invoice)
  - Log full callback payload in `callbackData`
  - Idempotent processing
  - Return 200 OK immediately

### TNG-003: TNG Payment Button Component
- **Priority**: P1
- **Description**: TNG branded payment button for customer portal
- **Acceptance Criteria**:
  - Blue button with TNG eWallet logo and "Pay with Touch 'n Go" text
  - Follow TNG brand guidelines:
    - Background: #005ABB (TNG blue)
    - Text: white
    - TNG eWallet logo on the left
    - Rounded corners
    - Minimum height: 44px
  - Device detection: determine if user is on mobile or desktop
  - Mobile behavior:
    1. Call initiate API with `platform: 'mobile'`
    2. Attempt to open TNG app via deep link
    3. If app not installed: fallback to app store link or web flow
  - Desktop behavior:
    1. Call initiate API with `platform: 'desktop'`
    2. Redirect to TNG web payment page
  - Loading state while initiating
  - Disabled when TNG is not configured

### TNG-004: TNG App Deep Link Flow
- **Priority**: P1
- **Description**: Deep link integration for mobile devices
- **Acceptance Criteria**:
  - Deep link format: `tngd://payments?txnId={id}&amount={amount}&ref={reference}`
  - Universal link fallback: `https://www.touchngo.com.my/payments?...`
  - Detection logic:
    1. Try to open deep link (hidden iframe or window.location)
    2. Set timeout (2 seconds)
    3. If app opened: user pays in TNG app, webhook notifies backend
    4. If app not opened (timeout): redirect to app store or TNG web
  - After payment in TNG app: user returns to portal manually (no redirect back from app)
  - Frontend shows payment status page with polling while user is in TNG app
  - "I've completed the payment" button to trigger manual status check

### TNG-005: TNG Payment Status Handling
- **Priority**: P1
- **Description**: Handle payment completion for TNG flow
- **Acceptance Criteria**:
  - After initiating TNG payment, navigate to payment status page
  - Status page polls every 5 seconds for payment completion
  - Mobile-specific UI:
    - "Waiting for payment in Touch 'n Go app..."
    - Spinner animation
    - "Open TNG App" button (re-opens deep link)
    - "I've completed the payment" button (triggers immediate status check)
  - Desktop-specific UI:
    - Standard redirect flow (same as GrabPay pattern)
    - User returns to payment status page after web payment
  - Handle states: PENDING, SUCCESS, FAILED, EXPIRED

### TNG-006: TNG Configuration
- **Priority**: P1
- **Description**: TNG-specific configuration in payment gateway settings
- **Acceptance Criteria**:
  - Uses shared `PaymentGatewayConfig` with `provider=TNG`
  - Required fields: Merchant ID (merchantId), API Secret (secretKey), Client ID (apiKey)
  - `metadata` JSON stores: `{ countryCode: 'MY', currency: 'MYR', transactionTimeout: 15 }`
  - Sandbox and production environments supported
  - Sandbox URL: `https://sandbox.tngdigital.com.my/v1`
  - Production URL: `https://api.tngdigital.com.my/v1`
  - "Test Connection" validates credentials

### TNG-007: TNG Refund Support
- **Priority**: P2
- **Description**: Support refunding TNG eWallet payments
- **Acceptance Criteria**:
  - Full or partial refund via TNG API
  - Refund credited back to customer's TNG eWallet
  - Track refund status in `OnlinePayment`
  - Admin interface for processing refunds

## API Endpoints

### TNG-Specific Endpoints

```
POST   /api/payments/online/tng/initiate                 - Initiate TNG payment
  Auth: Portal token OR authenticated user
  Body: { invoiceId: string, amount?: number, platform?: 'mobile' | 'desktop' }
  Response: {
    onlinePaymentId: string,
    deepLinkUrl?: string,        // For mobile: TNG app deep link
    redirectUrl?: string,        // For desktop: TNG web payment URL
    webFallbackUrl?: string,     // Fallback if app not installed
    expiresAt: string
  }

POST   /api/payments/online/tng/callback                 - TNG webhook notification
  Auth: Signature verification
  Body: TNG/aggregator webhook payload
  Response: { received: true }

POST   /api/payments/online/tng/refund                   - Refund TNG payment
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

### TNGPayButton Component

```tsx
// apps/web/src/components/payments/TNGPayButton.tsx

interface TNGPayButtonProps {
  invoiceId: string;
  amount: number;
  onPaymentInitiated?: (paymentId: string) => void;
  token?: string; // Portal token
  disabled?: boolean;
}

// Implementation:
// - Detect platform using navigator.userAgent or similar
// - Ant Design Button with custom TNG styling
// - Background: #005ABB (TNG blue), white text
// - TNG eWallet logo SVG on left
// - Text: "Pay with Touch 'n Go"
// - On click:
//   - Mobile:
//     1. Call initiate API with platform: 'mobile'
//     2. Store onlinePaymentId in sessionStorage
//     3. Attempt deep link: window.location.href = deepLinkUrl
//     4. Navigate to payment status page (user returns here after app)
//   - Desktop:
//     1. Call initiate API with platform: 'desktop'
//     2. Store onlinePaymentId in sessionStorage
//     3. Redirect to TNG web URL
```

### TNG Mobile Payment Status UI

```tsx
// Additional UI elements for the shared payment status page when provider=TNG and platform=mobile

// - "Waiting for payment in Touch 'n Go app..." message
// - Animated phone icon or TNG logo pulse animation
// - "Open TNG App" button: re-triggers deep link
// - "I've completed payment" button: immediate poll trigger
// - Timer showing how long the session remains valid
// - "Cancel" button to abandon payment attempt
```

### TNG in PayOnlineButton Dropdown

```tsx
// Integration with the shared PayOnlineButton component:
// - TNG appears as a menu item with TNG logo and "Touch 'n Go eWallet" text
// - On mobile: initiates deep link flow
// - On desktop: initiates redirect flow
```

## Business Logic

### TNG Payment Flow (Mobile - Deep Link)

1. Customer on mobile clicks "Pay with Touch 'n Go"
2. Frontend detects mobile platform
3. Calls `POST /api/payments/online/tng/initiate` with `platform: 'mobile'`
4. Backend creates `OnlinePayment` (PENDING), calls TNG API
5. Backend returns deep link URL
6. Frontend attempts to open TNG app via deep link
7. TNG app opens with payment details pre-filled
8. Customer confirms payment in TNG app
9. TNG processes payment
10. TNG sends webhook to `POST /api/payments/online/tng/callback`
11. Backend processes webhook, reconciles payment
12. Customer returns to portal (manually or via app switch)
13. Payment status page polling detects SUCCESS

### TNG Payment Flow (Desktop - Web Redirect)

1. Customer on desktop clicks "Pay with Touch 'n Go"
2. Frontend detects desktop platform
3. Calls `POST /api/payments/online/tng/initiate` with `platform: 'desktop'`
4. Backend creates `OnlinePayment` (PENDING), calls TNG API
5. Backend returns web redirect URL
6. Frontend redirects to TNG web payment page
7. Customer scans QR code on TNG web page with their TNG app (or logs in on web)
8. Customer confirms payment
9. TNG redirects customer back to portal payment status page
10. TNG sends webhook notification
11. Backend processes webhook, reconciles payment
12. Payment status page shows result

### TNG eWallet Open API Integration

```typescript
// apps/api/src/modules/payments/providers/tng.provider.ts

interface TNGProvider {
  createPayment(params: {
    merchantTransactionId: string;  // OnlinePayment.id
    amount: number;                  // In cents
    currency: string;                // 'MYR'
    description: string;             // 'Invoice INV-000001'
    callbackUrl: string;
    returnUrl: string;
    platform: 'mobile' | 'desktop';
  }): Promise<{
    transactionId: string;           // TNG transaction reference
    deepLinkUrl?: string;            // Mobile deep link
    redirectUrl?: string;            // Desktop web URL
    expiresAt: string;
  }>;

  verifyCallback(payload: any, signature: string): boolean;

  checkStatus(transactionId: string): Promise<{
    status: 'success' | 'failed' | 'pending' | 'expired';
    transactionRef: string;
    completedAt?: string;
  }>;

  refund(params: {
    merchantTransactionId: string;
    originalTransactionId: string;
    amount: number;
    currency: string;
    reason: string;
  }): Promise<{
    refundId: string;
    status: string;
  }>;
}
```

### Deep Link Handling Utility

```typescript
// apps/web/src/utils/deepLink.ts

export function attemptDeepLink(url: string, fallbackUrl: string, timeout: number = 2000): void {
  // 1. Create hidden iframe to attempt deep link
  // 2. Set timeout
  // 3. If app opens: iframe attempt succeeds, user switches to app
  // 4. If timeout: redirect to fallbackUrl (app store or web payment)
  // 5. Clean up iframe on completion
}

export function isMobileDevice(): boolean {
  // Detect mobile using userAgent or feature detection
  // Returns true for iOS and Android devices
}

export function isIOSDevice(): boolean {
  // Specific iOS detection for universal link handling
}

export function isAndroidDevice(): boolean {
  // Specific Android detection for intent URL handling
}
```

### Platform-Specific Deep Links

```
iOS:
  Universal Link: https://www.touchngo.com.my/payments?txnId={id}
  Custom Scheme: tngd://payments?txnId={id}

Android:
  Intent URL: intent://payments?txnId={id}#Intent;scheme=tngd;package=my.com.tngdigital.ewallet;end
  Fallback: Play Store link

Desktop:
  Web redirect: https://payment.tngdigital.com.my/pay?session={sessionId}
```

## Environment Variables

```env
# TNG eWallet Configuration (stored in PaymentGatewayConfig, these are fallbacks)
TNG_MERCHANT_ID=your-merchant-id
TNG_API_SECRET=your-api-secret
TNG_CLIENT_ID=your-client-id
TNG_ENVIRONMENT=sandbox  # sandbox | production
TNG_SANDBOX_URL=https://sandbox.tngdigital.com.my/v1
TNG_PRODUCTION_URL=https://api.tngdigital.com.my/v1
```

## Dependencies

No additional dependencies beyond what is already specified in the FPX spec.

## TNG Brand Guidelines

- Primary Blue: #005ABB
- White: #FFFFFF
- Official name: "Touch 'n Go eWallet" (with spaces and apostrophe)
- Short name: "TNG eWallet" (acceptable in UI)
- Logo must be displayed as provided (no alterations)
- Button text: "Pay with Touch 'n Go"
- Logo SVG asset stored in: `apps/web/public/images/payment-providers/tng-logo.svg`
- Minimum clear space around logo equal to the height of the "T" in the logo
