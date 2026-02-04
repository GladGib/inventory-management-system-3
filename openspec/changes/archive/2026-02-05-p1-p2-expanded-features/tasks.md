# Implementation Tasks

## Workstream 1: PDF Generation

### Task 1.1: PDF Service Setup
- [ ] Install puppeteer and handlebars dependencies
- [ ] Create PdfService in apps/api/src/modules/common/pdf/
- [ ] Create Handlebars template engine setup
- [ ] Create base PDF template with company header/footer
- [ ] Add PDF configuration to environment

### Task 1.2: Sales Order PDF
- [ ] Create sales-order.hbs template
- [ ] Add GET /api/sales/orders/:id/pdf endpoint
- [ ] Add download button to Sales Order detail page

### Task 1.3: Invoice PDF
- [ ] Create invoice.hbs template
- [ ] Add GET /api/sales/invoices/:id/pdf endpoint
- [ ] Add download button to Invoice detail page
- [ ] Add "PAID" watermark option

### Task 1.4: Purchase Order PDF
- [ ] Create purchase-order.hbs template
- [ ] Add GET /api/purchases/orders/:id/pdf endpoint
- [ ] Add download button to PO detail page

### Task 1.5: Bill PDF
- [ ] Create bill.hbs template
- [ ] Add GET /api/purchases/bills/:id/pdf endpoint
- [ ] Add download button to Bill detail page

## Workstream 2: Core Module Gaps

### Task 2.1: Item Images UI
- [ ] Create ImageUploader component
- [ ] Create ImageGallery component with drag-and-drop reorder
- [ ] Integrate into Item form (create/edit)
- [ ] Add thumbnail to Items list table
- [ ] Connect to existing upload API

### Task 2.2: Address Book
- [ ] Add Address model to Prisma schema
- [ ] Create AddressController and AddressService
- [ ] Create AddressCard and AddressForm components
- [ ] Add Addresses tab to Contact detail page
- [ ] Create AddressSelector for transaction forms

### Task 2.3: Payment Terms
- [ ] Add PaymentTerm model to Prisma schema
- [ ] Create PaymentTermsController and Service
- [ ] Create PaymentTermsSettings page
- [ ] Add PaymentTermSelect component
- [ ] Integrate into Contact form
- [ ] Auto-calculate due dates in Invoice/Bill forms

### Task 2.4: Item Groups UI
- [ ] Create ItemGroupsPage (list)
- [ ] Create ItemGroupForm with attribute builder
- [ ] Create ItemGroupDetail page with variants matrix
- [ ] Create VariantPicker component for transactions
- [ ] Add Item Groups to navigation menu

## Workstream 3: Transaction Gaps

### Task 3.1: Sales Returns Backend
- [ ] Add SalesReturn and CreditNote models to Prisma
- [ ] Create SalesReturnsController and Service
- [ ] Implement return workflow (approve, receive, process)
- [ ] Implement credit note generation
- [ ] Add stock restoration logic

### Task 3.2: Sales Returns UI
- [ ] Create SalesReturnsPage (list)
- [ ] Create SalesReturnForm
- [ ] Create SalesReturnDetail page
- [ ] Create CreditNotesPage (list)
- [ ] Add Sales Returns to navigation

### Task 3.3: Vendor Credits
- [ ] Add VendorCredit model to Prisma schema
- [ ] Create VendorCreditsController and Service
- [ ] Create VendorCreditsPage (list)
- [ ] Create VendorCreditForm
- [ ] Create VendorCreditDetail page
- [ ] Implement credit application to bills
- [ ] Add Vendor Credits to navigation

### Task 3.4: Purchase Receives UI
- [ ] Create PurchaseReceiveForm
- [ ] Update PurchaseReceivesPage
- [ ] Create PurchaseReceiveDetail page
- [ ] Create POSelector component
- [ ] Connect to existing receives API

### Task 3.5: Purchase by Vendor Report
- [ ] Add /api/reports/purchases/by-vendor endpoint
- [ ] Create PurchaseByVendorReportPage
- [ ] Add charts (pie, bar)
- [ ] Add to Reports navigation

## Workstream 4: SST Tax System

### Task 4.1: Tax Rates UI
- [ ] Create TaxRatesPage (settings)
- [ ] Create TaxRateForm modal
- [ ] Create TaxRateSelect component
- [ ] Add Tax Rates to settings navigation

### Task 4.2: Organization SST Settings
- [ ] Add OrganizationTaxSettings model
- [ ] Create SST settings section in Organization settings
- [ ] Add migration for tax settings

### Task 4.3: Tax Integration
- [ ] Create TaxBreakdown component
- [ ] Integrate TaxRateSelect into Item form
- [ ] Add tax breakdown to Invoice/Bill forms
- [ ] Update tax calculation in transaction services

## Workstream 5: Reports & Export

### Task 5.1: Stock Aging Report
- [ ] Add /api/reports/inventory/stock-aging endpoint
- [ ] Create StockAgingReportPage
- [ ] Add aging distribution charts
- [ ] Add slow-moving indicators
- [ ] Add to Reports navigation

### Task 5.2: Excel Export Service
- [ ] Install exceljs dependency
- [ ] Create ExcelExportService
- [ ] Add format=xlsx support to all report endpoints
- [ ] Create ExportDropdown component

### Task 5.3: PDF Report Export
- [ ] Create report PDF template
- [ ] Add format=pdf support to all report endpoints
- [ ] Add PDF option to ExportDropdown

### Task 5.4: Email Notifications
- [ ] Install nodemailer and bull dependencies
- [ ] Create EmailService with queue
- [ ] Create email templates (invoice, payment, order, PO)
- [ ] Add send endpoints to transaction controllers
- [ ] Create EmailSettingsPage
- [ ] Create SendEmailButton component

## Post-Implementation

### Task 6.1: Update Backlog
- [ ] Update docs/BACKLOG.md with completed items
- [ ] Update metrics section
- [ ] Verify 77% completion target

### Task 6.2: Testing
- [ ] Test PDF generation for all document types
- [ ] Test email sending (test mode)
- [ ] Test export functionality
- [ ] Verify all new pages are accessible
