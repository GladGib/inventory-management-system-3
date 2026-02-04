# PDF Document Generation

## Overview
Generate professional PDF documents for sales orders, invoices, purchase orders, and bills.

## Requirements

### PDF-001: Sales Order PDF
- **Priority**: P1
- **Description**: Generate downloadable PDF for sales orders
- **Acceptance Criteria**:
  - Company header with logo, name, address, SST number
  - Document number, date, expected ship date
  - Customer billing and shipping address
  - Line items table (SKU, name, qty, unit price, tax, total)
  - Subtotal, discount, tax breakdown, grand total
  - Terms and conditions
  - Footer with page numbers
  - A4 format, professional styling

### PDF-002: Invoice PDF
- **Priority**: P1
- **Description**: Generate downloadable PDF for invoices
- **Acceptance Criteria**:
  - All Sales Order PDF requirements
  - Invoice number and due date prominent
  - Payment status indicator
  - Bank details for payment
  - e-Invoice QR code placeholder (for future MyInvois)
  - "PAID" watermark option when fully paid

### PDF-003: Purchase Order PDF
- **Priority**: P1
- **Description**: Generate downloadable PDF for purchase orders
- **Acceptance Criteria**:
  - Company header (buyer)
  - Vendor details section
  - PO number, date, expected delivery date
  - Line items table with item details
  - Delivery instructions
  - Terms and conditions
  - Authorized signature line

### PDF-004: Bill PDF
- **Priority**: P1
- **Description**: Generate downloadable PDF for vendor bills
- **Acceptance Criteria**:
  - Vendor bill reference
  - Company as bill recipient
  - Payment due date prominent
  - Line items matching bill
  - Payment instructions/status

### PDF-005: PDF Service Architecture
- **Priority**: P1
- **Description**: Reusable PDF generation service
- **Acceptance Criteria**:
  - Puppeteer-based rendering
  - Handlebars templates
  - Shared partials (header, footer, table)
  - Organization branding support
  - Configurable paper size
  - Stream response for download

## API Endpoints

```
GET /api/sales/orders/:id/pdf         - Download SO PDF
GET /api/sales/invoices/:id/pdf       - Download Invoice PDF
GET /api/purchases/orders/:id/pdf     - Download PO PDF
GET /api/purchases/bills/:id/pdf      - Download Bill PDF
```

## Template Structure

```
apps/api/src/templates/
├── pdf/
│   ├── sales-order.hbs
│   ├── invoice.hbs
│   ├── purchase-order.hbs
│   ├── bill.hbs
│   └── partials/
│       ├── document-header.hbs
│       ├── document-footer.hbs
│       ├── line-items-table.hbs
│       ├── address-block.hbs
│       └── totals-section.hbs
└── styles/
    └── pdf.css
```

## Frontend Integration

### Download Button Component
```tsx
<Button
  icon={<FilePdfOutlined />}
  onClick={() => downloadPdf(documentId, documentType)}
>
  Download PDF
</Button>
```

### PDF Preview Modal (Optional)
- Embed PDF in modal using iframe or react-pdf
- Print button
- Download button
