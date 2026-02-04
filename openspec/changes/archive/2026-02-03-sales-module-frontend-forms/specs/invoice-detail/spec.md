## ADDED Requirements

### Requirement: Invoice detail page
The system SHALL provide a detail page at `/sales/invoices/[id]` for viewing invoices.

#### Scenario: Navigate to detail page
- **WHEN** user clicks invoice number link in invoices list
- **THEN** system navigates to `/sales/invoices/[id]`
- **AND** displays the invoice detail page

#### Scenario: Load invoice data
- **WHEN** user views invoice detail page
- **THEN** system fetches invoice by ID from GET /api/v1/sales/invoices/:id
- **AND** displays loading state while fetching

#### Scenario: Handle not found
- **WHEN** invoice ID does not exist
- **THEN** system displays "Invoice not found" error
- **AND** provides link back to invoices list

### Requirement: Invoice header display
The system SHALL display invoice header information.

#### Scenario: Display header
- **WHEN** user views invoice detail page
- **THEN** system displays: Invoice number, Status tag, Customer name, Invoice date, Due date
- **AND** displays back button to invoices list

### Requirement: Status workflow actions
The system SHALL display action buttons based on invoice status.

#### Scenario: Draft invoice actions
- **WHEN** invoice status is DRAFT
- **THEN** system displays buttons: Edit, Send Invoice, Void Invoice

#### Scenario: Sent invoice actions
- **WHEN** invoice status is SENT
- **THEN** system displays buttons: Record Payment, Void Invoice

#### Scenario: Partially paid invoice actions
- **WHEN** invoice status is PARTIALLY_PAID
- **THEN** system displays buttons: Record Payment, Void Invoice

#### Scenario: Paid invoice
- **WHEN** invoice status is PAID
- **THEN** system displays no action buttons (fully paid, read-only)

#### Scenario: Void invoice
- **WHEN** invoice status is VOID
- **THEN** system displays no action buttons (read-only)

### Requirement: Send invoice action
The system SHALL allow marking invoices as sent.

#### Scenario: Send with modal
- **WHEN** user clicks "Send Invoice" button
- **THEN** system displays confirmation modal
- **AND** on confirm, calls PUT /api/v1/sales/invoices/:id/send
- **AND** displays success message and refreshes page

### Requirement: Void invoice action
The system SHALL allow voiding invoices.

#### Scenario: Void with warning modal
- **WHEN** user clicks "Void Invoice" button
- **THEN** system displays warning modal with danger styling
- **AND** warns if invoice has payments
- **AND** on confirm, calls PUT /api/v1/sales/invoices/:id/void
- **AND** displays success message and refreshes page

### Requirement: Record payment from invoice
The system SHALL allow navigating to payment form from invoice.

#### Scenario: Navigate to payment form
- **WHEN** user clicks "Record Payment" button
- **THEN** system navigates to `/sales/payments/new?invoiceId={id}`
- **AND** payment form pre-selects the invoice

### Requirement: Invoice line items display
The system SHALL display invoice line items in a table.

#### Scenario: Display line items
- **WHEN** user views invoice detail page
- **THEN** system displays table with columns: Item, Description, Qty, Unit Price, Discount, Tax, Amount
- **AND** displays each line item from the invoice

### Requirement: Invoice totals display
The system SHALL display invoice totals summary.

#### Scenario: Display totals
- **WHEN** user views invoice detail page
- **THEN** system displays summary section with: Subtotal, Discount, Tax, Total, Amount Paid, Balance Due
- **AND** formats amounts in Malaysian Ringgit (RM)

### Requirement: Payment status display
The system SHALL display payment progress for the invoice.

#### Scenario: Show payment progress
- **WHEN** user views invoice detail page
- **THEN** system displays payment progress bar (amount paid / total)
- **AND** displays payment status badge (Unpaid, Partially Paid, Paid)

### Requirement: Related payments display
The system SHALL display payments applied to this invoice.

#### Scenario: Show payment history
- **WHEN** invoice has payments
- **THEN** system displays payments table with: Payment #, Date, Amount, Method
- **AND** payment numbers are clickable links to payment detail page

#### Scenario: No payments
- **WHEN** invoice has no payments
- **THEN** system displays "No payments recorded" message

### Requirement: Related sales order display
The system SHALL display linked sales order if applicable.

#### Scenario: Show linked order
- **WHEN** invoice is linked to a sales order
- **THEN** system displays "From Order: SO-XXXX" with clickable link to order detail
