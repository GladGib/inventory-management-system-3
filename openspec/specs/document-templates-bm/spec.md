# Document Templates BM Integration

## Overview
Wire existing i18n translation infrastructure into Handlebars PDF templates to produce bilingual (English/Bahasa Malaysia) business documents. Covers Sales Orders, Invoices, Purchase Orders, Bills, Quotes (new), and Credit Notes. Each template accepts a `locale` parameter and renders all labels, headers, footer text, and terms in the selected language.

## Requirements

### DTB-001: Document Translation Namespace
- **Priority**: P1
- **Description**: Create BM translations for document-specific terms
- **Acceptance Criteria**:
  - New i18n namespace: `locales/ms/documents.json`
  - Corresponding English namespace: `locales/en/documents.json`
  - All document labels translated (see full translation table below)
  - Follows existing i18n namespace pattern used by the project
  - Translations reviewed for Malaysian business context accuracy

### DTB-002: Template Locale Parameter
- **Priority**: P1
- **Description**: All PDF templates accept a locale parameter
- **Acceptance Criteria**:
  - PDF generation endpoints accept `?locale=en` or `?locale=ms` query parameter
  - Default locale: organization's `defaultDocumentLocale` setting (fallback: `en`)
  - Locale parameter passed through PDF service to Handlebars template context
  - Handlebars helper `{{t key locale}}` resolves translation from namespace
  - All static text in templates uses `{{t}}` helper instead of hardcoded strings

### DTB-003: Sales Order Template BM
- **Priority**: P1
- **Description**: Bilingual Sales Order PDF
- **Acceptance Criteria**:
  - Title: "Sales Order" / "Pesanan Jualan"
  - All column headers translated (Item, Description, Qty, Unit Price, Tax, Amount)
  - Footer labels translated (Subtotal, Discount, Tax, Total)
  - Terms & Conditions header translated
  - "Prepared by" / "Disediakan oleh" label
  - Date format: DD/MM/YYYY for both locales
  - Currency: "RM" prefix for both locales

### DTB-004: Invoice Template BM
- **Priority**: P1
- **Description**: Bilingual Invoice PDF
- **Acceptance Criteria**:
  - Title: "Invoice" / "Invois"
  - All Sales Order template translations plus:
  - "Invoice Number" / "No. Invois"
  - "Invoice Date" / "Tarikh Invois"
  - "Due Date" / "Tarikh Akhir Bayaran"
  - "Payment Terms" / "Terma Pembayaran"
  - "Bill To" / "Bil Kepada"
  - "Ship To" / "Hantar Kepada"
  - "Amount Due" / "Jumlah Perlu Dibayar"
  - "Amount Paid" / "Jumlah Dibayar"
  - "Balance Due" / "Baki Tertunggak"
  - Bank details section labels translated
  - "PAID" watermark / "TELAH DIBAYAR"
  - SST Registration label: "SST Reg. No." / "No. Pendaftaran SST"
  - e-Invoice QR code section label translated

### DTB-005: Purchase Order Template BM
- **Priority**: P1
- **Description**: Bilingual Purchase Order PDF
- **Acceptance Criteria**:
  - Title: "Purchase Order" / "Pesanan Belian"
  - "PO Number" / "No. Pesanan Belian"
  - "Order Date" / "Tarikh Pesanan"
  - "Expected Delivery" / "Tarikh Penghantaran Dijangka"
  - "Vendor" / "Pembekal"
  - "Delivery Address" / "Alamat Penghantaran"
  - "Delivery Instructions" / "Arahan Penghantaran"
  - "Authorized Signature" / "Tandatangan Dibenarkan"
  - Line item columns translated

### DTB-006: Bill Template BM
- **Priority**: P1
- **Description**: Bilingual Bill PDF
- **Acceptance Criteria**:
  - Title: "Bill" / "Bil"
  - "Bill Number" / "No. Bil"
  - "Bill Date" / "Tarikh Bil"
  - "Due Date" / "Tarikh Akhir Bayaran"
  - "Vendor Bill Ref" / "Rujukan Bil Pembekal"
  - "Payment Status" / "Status Pembayaran"
  - Line item columns translated
  - Totals section translated

### DTB-007: Quote Template BM
- **Priority**: P1
- **Description**: Bilingual Quote PDF (new template)
- **Acceptance Criteria**:
  - Title: "Quotation" / "Sebut Harga"
  - "Quote Number" / "No. Sebut Harga"
  - "Quote Date" / "Tarikh Sebut Harga"
  - "Valid Until" / "Sah Sehingga"
  - "Contact Person" / "Pegawai Perhubungan"
  - "Salesperson" / "Jurujual"
  - Line item columns translated
  - Totals section translated
  - Terms & Conditions translated
  - "This quotation is valid for X days" / "Sebut harga ini sah selama X hari"
  - Acceptance signature block: "Customer Acceptance" / "Penerimaan Pelanggan"

### DTB-008: Credit Note Template BM
- **Priority**: P1
- **Description**: Bilingual Credit Note PDF
- **Acceptance Criteria**:
  - Title: "Credit Note" / "Nota Kredit"
  - "Credit Note Number" / "No. Nota Kredit"
  - "Credit Date" / "Tarikh Kredit"
  - "Reference Invoice" / "Invois Rujukan"
  - "Reason" / "Sebab"
  - Line item columns translated
  - Totals section translated

### DTB-009: Organization Default Language Setting
- **Priority**: P1
- **Description**: Organization-level default document language
- **Acceptance Criteria**:
  - New field on Organization settings: `defaultDocumentLocale` (en/ms)
  - Configurable in Settings > General or Settings > Documents
  - Used as default when generating PDFs without explicit locale parameter
  - Ant Design Select with options: "English" and "Bahasa Malaysia"
  - Saved to Organization.settings JSON field

### DTB-010: Per-Document Language Override
- **Priority**: P2
- **Description**: Override language when generating individual documents
- **Acceptance Criteria**:
  - Language selector shown in PDF preview/download UI
  - Dropdown with "English" and "Bahasa Malaysia" options
  - Defaults to organization setting
  - Selection passed as `locale` query parameter to PDF endpoint
  - Language choice is not persisted on the document (per-generation only)

## Translation Files

### locales/en/documents.json

```json
{
  "document": {
    "page": "Page",
    "of": "of",
    "date": "Date",
    "generatedOn": "Generated on"
  },
  "salesOrder": {
    "title": "Sales Order",
    "orderNumber": "Order Number",
    "orderDate": "Order Date",
    "expectedShipDate": "Expected Ship Date",
    "customer": "Customer",
    "salesPerson": "Salesperson",
    "reference": "Reference",
    "warehouse": "Warehouse",
    "shippingAddress": "Shipping Address",
    "billingAddress": "Billing Address"
  },
  "invoice": {
    "title": "Invoice",
    "invoiceNumber": "Invoice Number",
    "invoiceDate": "Invoice Date",
    "dueDate": "Due Date",
    "paymentTerms": "Payment Terms",
    "billTo": "Bill To",
    "shipTo": "Ship To",
    "amountDue": "Amount Due",
    "amountPaid": "Amount Paid",
    "balanceDue": "Balance Due",
    "paidWatermark": "PAID",
    "bankDetails": "Bank Details",
    "bankName": "Bank Name",
    "accountName": "Account Name",
    "accountNumber": "Account Number",
    "sstRegNo": "SST Reg. No.",
    "eInvoice": "e-Invoice"
  },
  "purchaseOrder": {
    "title": "Purchase Order",
    "poNumber": "PO Number",
    "orderDate": "Order Date",
    "expectedDelivery": "Expected Delivery Date",
    "vendor": "Vendor",
    "deliveryAddress": "Delivery Address",
    "deliveryInstructions": "Delivery Instructions",
    "authorizedSignature": "Authorized Signature"
  },
  "bill": {
    "title": "Bill",
    "billNumber": "Bill Number",
    "billDate": "Bill Date",
    "dueDate": "Due Date",
    "vendorBillRef": "Vendor Bill Reference",
    "paymentStatus": "Payment Status",
    "vendor": "Vendor"
  },
  "quote": {
    "title": "Quotation",
    "quoteNumber": "Quote Number",
    "quoteDate": "Quote Date",
    "validUntil": "Valid Until",
    "contactPerson": "Contact Person",
    "salesperson": "Salesperson",
    "validityNote": "This quotation is valid for {{days}} days from the date of issue.",
    "customerAcceptance": "Customer Acceptance",
    "signatureDate": "Date",
    "signatureName": "Name",
    "signatureBlock": "Signature & Company Stamp"
  },
  "creditNote": {
    "title": "Credit Note",
    "creditNoteNumber": "Credit Note Number",
    "creditDate": "Credit Date",
    "referenceInvoice": "Reference Invoice",
    "reason": "Reason",
    "originalInvoiceAmount": "Original Invoice Amount",
    "creditAmount": "Credit Amount"
  },
  "lineItems": {
    "no": "No.",
    "item": "Item",
    "itemCode": "Item Code",
    "description": "Description",
    "quantity": "Qty",
    "unit": "Unit",
    "unitPrice": "Unit Price",
    "discount": "Discount",
    "tax": "Tax",
    "taxRate": "Tax Rate",
    "amount": "Amount",
    "total": "Total"
  },
  "totals": {
    "subtotal": "Subtotal",
    "discount": "Discount",
    "taxableAmount": "Taxable Amount",
    "taxAmount": "Tax Amount",
    "shippingCharges": "Shipping Charges",
    "grandTotal": "Grand Total",
    "totalInWords": "Total in Words",
    "currency": "RM"
  },
  "terms": {
    "title": "Terms & Conditions",
    "notes": "Notes",
    "preparedBy": "Prepared by",
    "approvedBy": "Approved by",
    "receivedBy": "Received by",
    "thankYou": "Thank you for your business."
  },
  "company": {
    "regNo": "Reg. No.",
    "tin": "TIN",
    "tel": "Tel",
    "fax": "Fax",
    "email": "Email",
    "website": "Website"
  },
  "payment": {
    "unpaid": "Unpaid",
    "partiallyPaid": "Partially Paid",
    "paid": "Paid",
    "overdue": "Overdue"
  }
}
```

### locales/ms/documents.json

```json
{
  "document": {
    "page": "Muka Surat",
    "of": "daripada",
    "date": "Tarikh",
    "generatedOn": "Dijana pada"
  },
  "salesOrder": {
    "title": "Pesanan Jualan",
    "orderNumber": "No. Pesanan",
    "orderDate": "Tarikh Pesanan",
    "expectedShipDate": "Tarikh Penghantaran Dijangka",
    "customer": "Pelanggan",
    "salesPerson": "Jurujual",
    "reference": "Rujukan",
    "warehouse": "Gudang",
    "shippingAddress": "Alamat Penghantaran",
    "billingAddress": "Alamat Pengebilan"
  },
  "invoice": {
    "title": "Invois",
    "invoiceNumber": "No. Invois",
    "invoiceDate": "Tarikh Invois",
    "dueDate": "Tarikh Akhir Bayaran",
    "paymentTerms": "Terma Pembayaran",
    "billTo": "Bil Kepada",
    "shipTo": "Hantar Kepada",
    "amountDue": "Jumlah Perlu Dibayar",
    "amountPaid": "Jumlah Dibayar",
    "balanceDue": "Baki Tertunggak",
    "paidWatermark": "TELAH DIBAYAR",
    "bankDetails": "Maklumat Bank",
    "bankName": "Nama Bank",
    "accountName": "Nama Akaun",
    "accountNumber": "No. Akaun",
    "sstRegNo": "No. Pendaftaran SST",
    "eInvoice": "e-Invois"
  },
  "purchaseOrder": {
    "title": "Pesanan Belian",
    "poNumber": "No. Pesanan Belian",
    "orderDate": "Tarikh Pesanan",
    "expectedDelivery": "Tarikh Penghantaran Dijangka",
    "vendor": "Pembekal",
    "deliveryAddress": "Alamat Penghantaran",
    "deliveryInstructions": "Arahan Penghantaran",
    "authorizedSignature": "Tandatangan Dibenarkan"
  },
  "bill": {
    "title": "Bil",
    "billNumber": "No. Bil",
    "billDate": "Tarikh Bil",
    "dueDate": "Tarikh Akhir Bayaran",
    "vendorBillRef": "Rujukan Bil Pembekal",
    "paymentStatus": "Status Pembayaran",
    "vendor": "Pembekal"
  },
  "quote": {
    "title": "Sebut Harga",
    "quoteNumber": "No. Sebut Harga",
    "quoteDate": "Tarikh Sebut Harga",
    "validUntil": "Sah Sehingga",
    "contactPerson": "Pegawai Perhubungan",
    "salesperson": "Jurujual",
    "validityNote": "Sebut harga ini sah selama {{days}} hari dari tarikh dikeluarkan.",
    "customerAcceptance": "Penerimaan Pelanggan",
    "signatureDate": "Tarikh",
    "signatureName": "Nama",
    "signatureBlock": "Tandatangan & Cop Syarikat"
  },
  "creditNote": {
    "title": "Nota Kredit",
    "creditNoteNumber": "No. Nota Kredit",
    "creditDate": "Tarikh Kredit",
    "referenceInvoice": "Invois Rujukan",
    "reason": "Sebab",
    "originalInvoiceAmount": "Jumlah Invois Asal",
    "creditAmount": "Jumlah Kredit"
  },
  "lineItems": {
    "no": "Bil.",
    "item": "Barangan",
    "itemCode": "Kod Barangan",
    "description": "Keterangan",
    "quantity": "Kuantiti",
    "unit": "Unit",
    "unitPrice": "Harga Seunit",
    "discount": "Diskaun",
    "tax": "Cukai",
    "taxRate": "Kadar Cukai",
    "amount": "Jumlah",
    "total": "Jumlah"
  },
  "totals": {
    "subtotal": "Jumlah Kecil",
    "discount": "Diskaun",
    "taxableAmount": "Jumlah Boleh Cukai",
    "taxAmount": "Jumlah Cukai",
    "shippingCharges": "Caj Penghantaran",
    "grandTotal": "Jumlah Keseluruhan",
    "totalInWords": "Jumlah Dalam Perkataan",
    "currency": "RM"
  },
  "terms": {
    "title": "Terma & Syarat",
    "notes": "Nota",
    "preparedBy": "Disediakan oleh",
    "approvedBy": "Diluluskan oleh",
    "receivedBy": "Diterima oleh",
    "thankYou": "Terima kasih atas urusan perniagaan anda."
  },
  "company": {
    "regNo": "No. Pendaftaran",
    "tin": "No. Pengenalan Cukai",
    "tel": "Tel",
    "fax": "Faks",
    "email": "E-mel",
    "website": "Laman Web"
  },
  "payment": {
    "unpaid": "Belum Dibayar",
    "partiallyPaid": "Dibayar Sebahagian",
    "paid": "Telah Dibayar",
    "overdue": "Tertunggak"
  }
}
```

## Template Implementation

### Handlebars Translation Helper

```typescript
// apps/api/src/modules/pdf/helpers/translation.helper.ts

import * as fs from 'fs';
import * as path from 'path';

const translations: Record<string, Record<string, any>> = {};

function loadTranslations(locale: string): Record<string, any> {
  if (translations[locale]) return translations[locale];

  const filePath = path.join(__dirname, `../../../locales/${locale}/documents.json`);
  const content = fs.readFileSync(filePath, 'utf-8');
  translations[locale] = JSON.parse(content);
  return translations[locale];
}

// Register Handlebars helper
export function registerTranslationHelper(handlebars: typeof Handlebars) {
  handlebars.registerHelper('t', function (key: string, options: any) {
    const locale = options.data.root.locale || 'en';
    const dict = loadTranslations(locale);

    // Support nested keys: "invoice.title" -> dict.invoice.title
    const keys = key.split('.');
    let value: any = dict;
    for (const k of keys) {
      value = value?.[k];
    }

    if (typeof value === 'string') {
      // Support interpolation: {{t "quote.validityNote" days=30}}
      if (options.hash) {
        Object.entries(options.hash).forEach(([k, v]) => {
          value = value.replace(`{{${k}}}`, String(v));
        });
      }
      return value;
    }

    // Fallback to key if translation not found
    return key;
  });
}
```

### Updated Invoice Template Example

```handlebars
{{!-- apps/api/src/templates/pdf/invoice.hbs --}}
<!DOCTYPE html>
<html lang="{{locale}}">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="pdf.css">
</head>
<body>
  {{> document-header organization=organization locale=locale}}

  <h1 class="document-title">{{t "invoice.title"}}</h1>

  <div class="document-meta">
    <div class="meta-row">
      <span class="meta-label">{{t "invoice.invoiceNumber"}}:</span>
      <span class="meta-value">{{invoice.invoiceNumber}}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">{{t "invoice.invoiceDate"}}:</span>
      <span class="meta-value">{{formatDate invoice.invoiceDate "DD/MM/YYYY"}}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">{{t "invoice.dueDate"}}:</span>
      <span class="meta-value">{{formatDate invoice.dueDate "DD/MM/YYYY"}}</span>
    </div>
    {{#if invoice.paymentTermDays}}
    <div class="meta-row">
      <span class="meta-label">{{t "invoice.paymentTerms"}}:</span>
      <span class="meta-value">{{invoice.paymentTermDays}} {{t "document.date"}}s</span>
    </div>
    {{/if}}
    {{#if organization.sstNumber}}
    <div class="meta-row">
      <span class="meta-label">{{t "invoice.sstRegNo"}}:</span>
      <span class="meta-value">{{organization.sstNumber}}</span>
    </div>
    {{/if}}
  </div>

  <div class="addresses">
    <div class="address-block">
      <h3>{{t "invoice.billTo"}}</h3>
      {{> address-block address=invoice.billingAddress}}
    </div>
    {{#if invoice.shippingAddress}}
    <div class="address-block">
      <h3>{{t "invoice.shipTo"}}</h3>
      {{> address-block address=invoice.shippingAddress}}
    </div>
    {{/if}}
  </div>

  {{> line-items-table items=invoice.items locale=locale}}

  {{> totals-section
    subtotal=invoice.subtotal
    discountAmount=invoice.discountAmount
    taxAmount=invoice.taxAmount
    total=invoice.total
    amountPaid=invoice.amountPaid
    balance=invoice.balance
    locale=locale
    showPaymentInfo=true
  }}

  {{#if invoice.notes}}
  <div class="notes-section">
    <h3>{{t "terms.notes"}}</h3>
    <p>{{invoice.notes}}</p>
  </div>
  {{/if}}

  {{#if invoice.termsConditions}}
  <div class="terms-section">
    <h3>{{t "terms.title"}}</h3>
    <p>{{invoice.termsConditions}}</p>
  </div>
  {{/if}}

  {{#if invoice.bankDetails}}
  <div class="bank-details">
    <h3>{{t "invoice.bankDetails"}}</h3>
    <div>{{t "invoice.bankName"}}: {{invoice.bankDetails.bankName}}</div>
    <div>{{t "invoice.accountName"}}: {{invoice.bankDetails.accountName}}</div>
    <div>{{t "invoice.accountNumber"}}: {{invoice.bankDetails.accountNumber}}</div>
  </div>
  {{/if}}

  <div class="footer-message">
    <p>{{t "terms.thankYou"}}</p>
  </div>

  {{#if invoice.isPaid}}
  <div class="paid-watermark">{{t "invoice.paidWatermark"}}</div>
  {{/if}}

  {{> document-footer locale=locale}}
</body>
</html>
```

### Updated Line Items Partial

```handlebars
{{!-- apps/api/src/templates/pdf/partials/line-items-table.hbs --}}
<table class="line-items">
  <thead>
    <tr>
      <th class="col-no">{{t "lineItems.no"}}</th>
      <th class="col-item">{{t "lineItems.item"}}</th>
      <th class="col-desc">{{t "lineItems.description"}}</th>
      <th class="col-qty">{{t "lineItems.quantity"}}</th>
      <th class="col-unit">{{t "lineItems.unit"}}</th>
      <th class="col-price">{{t "lineItems.unitPrice"}} ({{t "totals.currency"}})</th>
      {{#if showDiscount}}
      <th class="col-discount">{{t "lineItems.discount"}}</th>
      {{/if}}
      <th class="col-tax">{{t "lineItems.tax"}}</th>
      <th class="col-amount">{{t "lineItems.amount"}} ({{t "totals.currency"}})</th>
    </tr>
  </thead>
  <tbody>
    {{#each items}}
    <tr>
      <td class="col-no">{{@index_plus_one}}</td>
      <td class="col-item">
        {{#if (eq ../locale "ms")}}
          {{#if this.item.nameMalay}}{{this.item.nameMalay}}{{else}}{{this.item.name}}{{/if}}
        {{else}}
          {{this.item.name}}
        {{/if}}
      </td>
      <td class="col-desc">{{this.description}}</td>
      <td class="col-qty number">{{formatNumber this.quantity}}</td>
      <td class="col-unit">{{this.unit}}</td>
      <td class="col-price number">{{formatCurrency this.rate}}</td>
      {{#if ../showDiscount}}
      <td class="col-discount number">{{formatCurrency this.discountAmount}}</td>
      {{/if}}
      <td class="col-tax number">{{formatCurrency this.taxAmount}}</td>
      <td class="col-amount number">{{formatCurrency this.amount}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
```

### Updated Totals Partial

```handlebars
{{!-- apps/api/src/templates/pdf/partials/totals-section.hbs --}}
<div class="totals-section">
  <table class="totals-table">
    <tr>
      <td class="label">{{t "totals.subtotal"}}:</td>
      <td class="value">{{t "totals.currency"}} {{formatCurrency subtotal}}</td>
    </tr>
    {{#if discountAmount}}
    <tr>
      <td class="label">{{t "totals.discount"}}:</td>
      <td class="value">- {{t "totals.currency"}} {{formatCurrency discountAmount}}</td>
    </tr>
    {{/if}}
    {{#if taxAmount}}
    <tr>
      <td class="label">{{t "totals.taxAmount"}}:</td>
      <td class="value">{{t "totals.currency"}} {{formatCurrency taxAmount}}</td>
    </tr>
    {{/if}}
    {{#if shippingCharges}}
    <tr>
      <td class="label">{{t "totals.shippingCharges"}}:</td>
      <td class="value">{{t "totals.currency"}} {{formatCurrency shippingCharges}}</td>
    </tr>
    {{/if}}
    <tr class="grand-total">
      <td class="label">{{t "totals.grandTotal"}}:</td>
      <td class="value">{{t "totals.currency"}} {{formatCurrency total}}</td>
    </tr>
    {{#if showPaymentInfo}}
    {{#if amountPaid}}
    <tr>
      <td class="label">{{t "invoice.amountPaid"}}:</td>
      <td class="value">{{t "totals.currency"}} {{formatCurrency amountPaid}}</td>
    </tr>
    <tr class="balance-due">
      <td class="label">{{t "invoice.balanceDue"}}:</td>
      <td class="value">{{t "totals.currency"}} {{formatCurrency balance}}</td>
    </tr>
    {{/if}}
    {{/if}}
  </table>
</div>
```

## API Endpoint Changes

```
# Modified existing endpoints - add ?locale=en|ms parameter
GET /api/sales/orders/:id/pdf?locale=ms          - Download SO PDF in BM
GET /api/sales/invoices/:id/pdf?locale=ms         - Download Invoice PDF in BM
GET /api/purchases/orders/:id/pdf?locale=ms       - Download PO PDF in BM
GET /api/purchases/bills/:id/pdf?locale=ms        - Download Bill PDF in BM
GET /api/sales/quotes/:id/pdf?locale=ms           - Download Quote PDF in BM (new)
GET /api/sales/credit-notes/:id/pdf?locale=ms     - Download Credit Note PDF in BM
```

## Frontend Changes

### PDF Download UI Modification

```tsx
// Update existing PDF download buttons across all document detail pages

interface PdfDownloadButtonProps {
  documentType: 'sales-order' | 'invoice' | 'purchase-order' | 'bill' | 'quote' | 'credit-note';
  documentId: string;
  defaultLocale?: string; // From organization settings
}

// Renders as Ant Design Button.Group or Dropdown:
// [Download PDF v]
//   > English
//   > Bahasa Malaysia

// Or as split button:
// [Download PDF] [v]
//   > English
//   > Bahasa Malaysia
```

### Organization Settings Addition

```tsx
// Add to existing Settings > General page or new Settings > Documents page:

// Document Language section:
// - Label: "Default Document Language" / "Bahasa Dokumen Lalai"
// - Select: English | Bahasa Malaysia
// - Help text: "This language will be used when generating PDF documents.
//              You can override this per document."
// - Save updates Organization.settings.defaultDocumentLocale
```

### Page Structure

```
apps/web/app/(dashboard)/settings/
├── page.tsx                    # General settings (add defaultDocumentLocale field)

# No new pages needed - modifications to existing document detail pages:
apps/web/app/(dashboard)/sales/orders/[id]/page.tsx     # Update PDF download button
apps/web/app/(dashboard)/sales/invoices/[id]/page.tsx   # Update PDF download button
apps/web/app/(dashboard)/purchases/orders/[id]/page.tsx # Update PDF download button
apps/web/app/(dashboard)/purchases/bills/[id]/page.tsx  # Update PDF download button
apps/web/app/(dashboard)/sales/quotes/[id]/page.tsx     # New (see sales-quotes spec)
apps/web/app/(dashboard)/sales/credit-notes/[id]/page.tsx # Update PDF download button
```

## Template File Structure

```
apps/api/src/
├── locales/
│   ├── en/
│   │   └── documents.json         # English document translations
│   └── ms/
│       └── documents.json         # BM document translations
├── templates/
│   ├── pdf/
│   │   ├── sales-order.hbs        # Updated with {{t}} helpers
│   │   ├── invoice.hbs            # Updated with {{t}} helpers
│   │   ├── purchase-order.hbs     # Updated with {{t}} helpers
│   │   ├── bill.hbs               # Updated with {{t}} helpers
│   │   ├── quote.hbs              # NEW template
│   │   ├── credit-note.hbs        # NEW template
│   │   └── partials/
│   │       ├── document-header.hbs  # Updated with {{t}} helpers
│   │       ├── document-footer.hbs  # Updated with {{t}} helpers
│   │       ├── line-items-table.hbs # Updated with {{t}} helpers
│   │       ├── address-block.hbs    # Unchanged (addresses are data, not labels)
│   │       └── totals-section.hbs   # Updated with {{t}} helpers
│   └── styles/
│       └── pdf.css                # Unchanged
└── modules/
    └── pdf/
        ├── helpers/
        │   └── translation.helper.ts  # NEW - Handlebars {{t}} helper
        └── pdf.service.ts             # Updated to pass locale to templates
```

## Formatting Rules

### Date Format
- Both `en` and `ms` locales use DD/MM/YYYY format
- Example: 15/01/2025

### Currency Display
- Both `en` and `ms` locales use "RM" prefix
- Example: RM 1,234.56
- Number format: 1,234.56 (comma for thousands, period for decimal)

### Item Names
- When locale is `ms` and `item.nameMalay` exists, display `nameMalay`
- When locale is `ms` and `item.nameMalay` is null, fall back to `item.name`
- When locale is `en`, always display `item.name`

## Dependencies
- Existing PDF service (Puppeteer + Handlebars)
- Existing i18n infrastructure (locales directory pattern)
- Existing template partials (header, footer, line-items, totals)
- Sales Quotes spec (for quote template)
- Organization settings model (for defaultDocumentLocale)
