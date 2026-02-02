# MyInvois e-Invoice Integration

## Overview
Integration with Malaysia's MyInvois system (LHDN) for mandatory e-invoicing compliance.

## Requirements

### EI-001: MyInvois Registration
- **Priority**: P0
- **Description**: Configure MyInvois credentials
- **Acceptance Criteria**:
  - Store MyInvois TIN (Tax ID)
  - API client ID and secret
  - Certificate management
  - Sandbox/production toggle
  - Connection status check

### EI-002: e-Invoice Generation
- **Priority**: P0
- **Description**: Generate e-invoice XML/JSON
- **Acceptance Criteria**:
  - UBL 2.1 compliant format
  - All mandatory fields
  - Digital signature
  - Generate unique UUID
  - Store submission data

### EI-003: e-Invoice Submission
- **Priority**: P0
- **Description**: Submit invoice to MyInvois
- **Acceptance Criteria**:
  - Submit single invoice
  - Batch submission support
  - Handle API responses
  - Retry on failure
  - Track submission status

### EI-004: e-Invoice Validation
- **Priority**: P0
- **Description**: Handle validation responses
- **Acceptance Criteria**:
  - Parse validation result
  - Store validation UUID
  - Handle rejection reasons
  - Update invoice status
  - Notification on result

### EI-005: QR Code Generation
- **Priority**: P0
- **Description**: Generate verification QR code
- **Acceptance Criteria**:
  - Generate after validation
  - Include validation link
  - Embed in invoice PDF
  - Store QR code data

### EI-006: e-Invoice Cancellation
- **Priority**: P0
- **Description**: Cancel validated e-invoice
- **Acceptance Criteria**:
  - Submit cancellation request
  - Provide reason code
  - Within 72-hour window
  - Update local records

### EI-007: Credit/Debit Notes
- **Priority**: P0
- **Description**: Submit credit/debit notes
- **Acceptance Criteria**:
  - Link to original e-invoice
  - Submit as adjustment document
  - Handle validation
  - Generate QR code

### EI-008: e-Invoice Reports
- **Priority**: P1
- **Description**: Track e-invoice submissions
- **Acceptance Criteria**:
  - Submission history
  - Validation status summary
  - Error tracking
  - Compliance dashboard

## API Endpoints

```
POST   /api/einvoice/submit/:invoiceId    - Submit single invoice
POST   /api/einvoice/submit-batch         - Submit batch
GET    /api/einvoice/status/:invoiceId    - Check status
POST   /api/einvoice/cancel/:invoiceId    - Cancel e-invoice
GET    /api/einvoice/qrcode/:invoiceId    - Get QR code
GET    /api/einvoice/submissions          - List submissions
POST   /api/einvoice/validate-tin         - Validate TIN
GET    /api/einvoice/settings             - Get settings
PUT    /api/einvoice/settings             - Update settings
```

## Database Schema

```prisma
model EInvoiceSettings {
  id                  String   @id @default(cuid())
  organizationId      String   @unique
  organization        Organization @relation(fields: [organizationId], references: [id])
  tin                 String?  // Tax Identification Number
  brn                 String?  // Business Registration Number
  clientId            String?  // MyInvois API client
  clientSecret        String?  // Encrypted
  certificatePath     String?
  isProduction        Boolean  @default(false)
  isEnabled           Boolean  @default(false)
  autoSubmit          Boolean  @default(false)
  lastConnectionCheck DateTime?
  connectionStatus    String?
}

model EInvoiceSubmission {
  id                  String           @id @default(cuid())
  invoiceId           String
  invoice             Invoice          @relation(fields: [invoiceId], references: [id])
  submissionUuid      String?          // Our submission UUID
  documentUuid        String?          // MyInvois document UUID
  longId              String?          // MyInvois long ID
  status              EInvoiceStatus   @default(PENDING)
  submittedAt         DateTime?
  validatedAt         DateTime?
  cancelledAt         DateTime?
  rejectionReasons    Json?
  qrCodeData          String?
  qrCodeUrl           String?
  rawRequest          Json?
  rawResponse         Json?
  retryCount          Int              @default(0)
  lastError           String?
  organizationId      String
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt
}

model EInvoiceDocument {
  id                  String   @id @default(cuid())
  submissionId        String
  submission          EInvoiceSubmission @relation(fields: [submissionId], references: [id])
  documentType        EInvoiceDocType
  xmlContent          String   @db.Text
  signedXml           String?  @db.Text
  hash                String?
  createdAt           DateTime @default(now())
}

enum EInvoiceStatus {
  PENDING           // Not yet submitted
  SUBMITTING        // In progress
  SUBMITTED         // Awaiting validation
  VALID             // Validated by LHDN
  INVALID           // Rejected by LHDN
  CANCELLED         // Cancelled
  ERROR             // System error
}

enum EInvoiceDocType {
  INVOICE
  CREDIT_NOTE
  DEBIT_NOTE
  REFUND_NOTE
  SELF_BILLED
}
```

## MyInvois API Integration

```typescript
interface MyInvoisConfig {
  baseUrl: string;           // Sandbox or production
  clientId: string;
  clientSecret: string;
  tin: string;
}

interface SubmissionResult {
  submissionUid: string;
  acceptedDocuments: AcceptedDocument[];
  rejectedDocuments: RejectedDocument[];
}

interface AcceptedDocument {
  uuid: string;
  invoiceCodeNumber: string;
  longId: string;
}

interface RejectedDocument {
  invoiceCodeNumber: string;
  error: {
    code: string;
    message: string;
    target?: string;
    details?: ErrorDetail[];
  };
}
```

## Document Format (UBL 2.1)

Key fields required:
- Invoice number
- Issue date/time
- Supplier TIN, BRN, name, address
- Buyer TIN, BRN, name, address
- Line items with classification codes
- Tax totals per rate
- Document total
- Digital signature
