# DuitNow QR Payment Integration

## Overview
Integration with DuitNow QR, Malaysia's national QR payment standard operated by PayNet. DuitNow QR allows customers to pay invoices by scanning a QR code from any participating bank or eWallet app. This spec uses the shared `PaymentGatewayConfig` and `OnlinePayment` models defined in the FPX payment gateway spec.

## Requirements

### DN-001: DuitNow QR Generation
- **Priority**: P0
- **Description**: Generate DuitNow QR codes for invoice payments
- **Acceptance Criteria**:
  - `POST /api/payments/online/duitnow/generate-qr` creates a QR payment session
  - Input: `{ invoiceId, amount?: number }` (amount defaults to invoice balance)
  - Create `OnlinePayment` record with `provider=DUITNOW`, status PENDING
  - Call aggregator API to generate DuitNow QR payload
  - Return QR code data (string) and expiry time
  - QR code follows Malaysian PayNet DuitNow QR standard (EMVCo format)
  - Default timeout: 15 minutes (configurable in `PaymentGatewayConfig.metadata`)
  - Set `OnlinePayment.expiresAt` based on timeout

### DN-002: DuitNow QR Component
- **Priority**: P0
- **Description**: Frontend component that displays DuitNow QR and polls for payment
- **Acceptance Criteria**:
  - Renders QR code from the QR data string using `qrcode.react` or Ant Design QRCode
  - Displays: amount (MYR), invoice number, timer countdown to expiry
  - Auto-polls `GET /api/payments/online/:id/status` every 5 seconds
  - On SUCCESS: show success animation and payment confirmation
  - On EXPIRED: show "QR expired" message with "Generate New QR" button
  - On FAILED: show error message with "Try Again" button
  - QR code sized at 280x280px (suitable for mobile scanning)
  - Include "Scan with any DuitNow-enabled banking app" instruction text
  - Display DuitNow logo below QR code

### DN-003: DuitNow Callback Handler
- **Priority**: P0
- **Description**: Handle payment notification webhook from DuitNow via aggregator
- **Acceptance Criteria**:
  - `POST /api/payments/online/duitnow/callback` receives webhook
  - Verify webhook signature per aggregator scheme
  - Look up `OnlinePayment` by provider transaction ID
  - Update status based on payment result
  - On SUCCESS: auto-reconcile (create Payment, update Invoice) -- same as FPX flow
  - Log full callback payload
  - Idempotent processing
  - Return 200 OK immediately

### DN-004: DuitNow QR on Invoice PDF
- **Priority**: P1
- **Description**: Optional DuitNow QR code printed on invoice PDFs
- **Acceptance Criteria**:
  - Organization setting: `settings.duitnowOnInvoicePdf: boolean` (default false)
  - When enabled and DuitNow gateway is active:
    - Generate a static DuitNow QR code for the invoice amount
    - Embed QR code image on the invoice PDF (bottom right area)
    - Include text: "Scan to pay with DuitNow" and amount
  - Static QR uses a pre-generated merchant QR with invoice reference
  - Note: static QR on PDF cannot have real-time status polling (informational only)
  - Payment reconciliation still happens via webhook when customer pays

### DN-005: DuitNow QR Expiry Handling
- **Priority**: P0
- **Description**: Handle QR code timeout and expiry
- **Acceptance Criteria**:
  - Default expiry: 15 minutes from generation
  - Configurable per organization via `PaymentGatewayConfig.metadata.qrTimeoutMinutes`
  - Minimum: 5 minutes, Maximum: 60 minutes
  - Frontend countdown timer shows remaining time (MM:SS format)
  - When timer reaches 0: stop polling, show expired state
  - Backend: scheduled task marks PENDING payments as EXPIRED when past `expiresAt`
  - Expired QR codes cannot be paid (aggregator rejects payment)

### DN-006: DuitNow Payment Modal
- **Priority**: P0
- **Description**: Modal for DuitNow payment in customer portal
- **Acceptance Criteria**:
  - Triggered from "Pay Online" button when DuitNow is selected
  - Modal content:
    - DuitNow logo and title
    - Invoice number and amount prominently displayed
    - QR code (centered, 280x280px)
    - Countdown timer
    - Instruction: "Open your banking app and scan this QR code"
    - List of participating apps (icons: Maybank, CIMB, Touch 'n Go, GrabPay, etc.)
  - Status transitions within modal:
    - Generating QR: loading spinner
    - QR Ready: QR code + countdown
    - Payment Received: success checkmark + details
    - Expired: warning + regenerate button
  - Close button available at all times
  - On close while PENDING: show confirmation "Payment is still pending. Are you sure?"

## API Endpoints

### DuitNow-Specific Endpoints

```
POST   /api/payments/online/duitnow/generate-qr        - Generate DuitNow QR
  Auth: Portal token OR authenticated user
  Body: { invoiceId: string, amount?: number }
  Response: {
    onlinePaymentId: string,
    qrData: string,              // QR code payload string
    qrImageUrl?: string,         // Optional pre-rendered QR image URL from aggregator
    amount: number,
    currency: 'MYR',
    expiresAt: string,           // ISO 8601 timestamp
    timeoutMinutes: number
  }

POST   /api/payments/online/duitnow/callback            - DuitNow webhook
  Auth: Signature verification
  Body: Provider-specific callback payload
  Response: { received: true }
```

Shared endpoints from FPX spec also used:
```
GET    /api/payments/online/:id/status                  - Poll payment status
GET    /api/payments/online                             - List online payments (admin)
```

## Frontend Components

### DuitNowQR Component

```tsx
// apps/web/src/components/payments/DuitNowQR.tsx

interface DuitNowQRProps {
  invoiceId: string;
  amount: number;
  invoiceNumber: string;
  visible: boolean;
  onClose: () => void;
  onPaymentSuccess: (paymentId: string) => void;
  token?: string; // Portal token
}

// State management:
// - qrState: 'loading' | 'ready' | 'success' | 'failed' | 'expired'
// - onlinePaymentId: string | null
// - qrData: string | null
// - expiresAt: Date | null
// - remainingSeconds: number

// Lifecycle:
// 1. On mount/visible: call generate-qr API
// 2. On QR ready: start countdown timer (1s interval) + status polling (5s interval)
// 3. On status === SUCCESS: clear intervals, show success
// 4. On countdown === 0: clear intervals, show expired
// 5. On unmount: clear all intervals

// Components used:
// - Ant Design: Modal, QRCode (antd 5.x), Statistic.Countdown, Result, Button, Space, Typography, Spin, Divider
// - Bank app icons row: Maybank, CIMB, RHB, Public Bank, Hong Leong, AmBank, Touch'n Go, GrabPay
```

### DuitNow QR for Invoice PDF

```tsx
// apps/api/src/modules/pdf/duitnow-qr.helper.ts

// Helper function for PDF generation:
// 1. Check if organization has DuitNow enabled and duitnowOnInvoicePdf setting is true
// 2. Generate QR data string using DuitNow merchant QR format
// 3. Render QR to PNG buffer using 'qrcode' npm package
// 4. Return buffer for embedding in PDF
// 5. Include in invoice PDF template if available

// QR data format (EMVCo Merchant Presented Mode):
// - Payload Format Indicator: "01"
// - Point of Initiation: "12" (dynamic)
// - Merchant Account Info: DuitNow merchant ID + invoice reference
// - Transaction Amount: invoice balance
// - Country Code: "MY"
// - Merchant Name: organization name
// - Merchant City: organization city
// - CRC checksum
```

## Business Logic

### DuitNow QR Payment Flow

1. Customer clicks "Pay Online" on invoice in portal
2. Selects "DuitNow QR" as payment method
3. DuitNow modal opens, calls `POST /api/payments/online/duitnow/generate-qr`
4. Backend creates `OnlinePayment` (PENDING), calls aggregator for QR data
5. Modal displays QR code with countdown timer
6. Customer opens their banking/eWallet app and scans QR
7. Customer confirms payment in their app
8. Bank/eWallet processes payment through DuitNow network
9. Aggregator receives payment notification
10. Aggregator sends webhook to `POST /api/payments/online/duitnow/callback`
11. Backend verifies signature, updates `OnlinePayment` to SUCCESS
12. Backend auto-reconciles: creates Payment + PaymentAllocation, updates Invoice
13. Frontend polling detects SUCCESS, shows confirmation in modal

### QR Code Regeneration

1. QR expires (countdown reaches 0 or backend marks EXPIRED)
2. Customer clicks "Generate New QR"
3. Previous `OnlinePayment` remains as EXPIRED (for audit trail)
4. New `OnlinePayment` created with fresh QR and new timeout
5. Modal updates with new QR code and fresh countdown

### Aggregator DuitNow Integration

```typescript
// apps/api/src/modules/payments/providers/duitnow.provider.ts

interface DuitNowProvider {
  generateQR(params: {
    amount: number;
    invoiceReference: string;
    merchantId: string;
    expiryMinutes: number;
    callbackUrl: string;
  }): Promise<{
    transactionId: string;
    qrData: string;
    qrImageUrl?: string;
    expiresAt: string;
  }>;

  verifyCallback(payload: any, signature: string): boolean;

  checkStatus(transactionId: string): Promise<{
    status: 'success' | 'failed' | 'pending';
    transactionRef: string;
    payerInfo?: { bankName: string; accountMasked: string };
  }>;
}
```

### PayNet DuitNow QR Standard Compliance

- QR code format: EMVCo Merchant Presented Mode (MPM)
- Tag 00: Payload Format Indicator = "01"
- Tag 01: Point of Initiation = "12" (Dynamic QR)
- Tag 26-51: Merchant Account Information (DuitNow-specific)
  - Sub-tag 00: Reverse domain "com.paynet"
  - Sub-tag 01: Merchant ID / DuitNow Proxy ID
  - Sub-tag 02: Merchant criteria
- Tag 52: Merchant Category Code (MCC)
- Tag 53: Transaction Currency = "458" (MYR)
- Tag 54: Transaction Amount
- Tag 58: Country Code = "MY"
- Tag 59: Merchant Name
- Tag 60: Merchant City
- Tag 63: CRC (CRC-16/CCITT-FALSE)

## Dependencies

```json
{
  "qrcode": "^1.5.3",
  "qrcode.react": "^3.1.0"
}
```

Note: `antd` 5.x includes a built-in `QRCode` component that can be used instead of `qrcode.react`.
