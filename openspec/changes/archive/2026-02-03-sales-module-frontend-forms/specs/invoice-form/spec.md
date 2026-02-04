## ADDED Requirements

### Requirement: Create invoice page
The system SHALL provide a form page at `/sales/invoices/new` for creating new invoices.

#### Scenario: Navigate to create form
- **WHEN** user clicks "New Invoice" button on invoices list page
- **THEN** system navigates to `/sales/invoices/new`
- **AND** displays empty invoice form

#### Scenario: Page layout
- **WHEN** user views the create invoice page
- **THEN** system displays a two-column layout with form on left and summary on right
- **AND** displays header with "New Invoice" title and back button

### Requirement: Customer selection for invoice
The system SHALL allow users to select a customer for the invoice.

#### Scenario: Search for customer
- **WHEN** user types in customer select field
- **THEN** system displays matching customers from API search

#### Scenario: Customer required
- **WHEN** user attempts to submit form without selecting customer
- **THEN** system displays validation error "Please select a customer"

### Requirement: Invoice line items management
The system SHALL allow users to add, edit, and remove line items.

#### Scenario: Add line item
- **WHEN** user clicks "Add Item" button
- **THEN** system adds a new empty row to the line items table

#### Scenario: Select item for line
- **WHEN** user selects an item from the item dropdown
- **THEN** system populates item details and auto-fills unit price
- **AND** calculates row total

#### Scenario: Edit line item values
- **WHEN** user changes quantity, unit price, or discount
- **THEN** system recalculates row total and invoice total

#### Scenario: Remove line item
- **WHEN** user clicks remove button on a line item row
- **THEN** system removes the row and recalculates totals

#### Scenario: At least one item required
- **WHEN** user attempts to submit form with no line items
- **THEN** system displays validation error "At least one item is required"

### Requirement: Invoice dates
The system SHALL support invoice and due dates.

#### Scenario: Set invoice date
- **WHEN** user selects invoice date
- **THEN** system stores the selected date (defaults to today)

#### Scenario: Set due date
- **WHEN** user selects due date
- **THEN** system stores the due date
- **AND** due date must be on or after invoice date

#### Scenario: Due date validation
- **WHEN** user selects due date before invoice date
- **THEN** system displays validation error "Due date must be on or after invoice date"

### Requirement: Invoice discount
The system SHALL support invoice-level discounts.

#### Scenario: Apply percentage discount
- **WHEN** user selects "Percentage" discount type and enters a value
- **THEN** system applies percentage to subtotal

#### Scenario: Apply fixed discount
- **WHEN** user selects "Fixed" discount type and enters a value
- **THEN** system subtracts fixed amount from subtotal

### Requirement: Invoice summary sidebar
The system SHALL display a real-time invoice summary.

#### Scenario: Display totals
- **WHEN** user is on create/edit invoice page
- **THEN** system displays summary card with: Subtotal, Discount, Tax, Total
- **AND** updates values in real-time

### Requirement: Submit invoice
The system SHALL submit the invoice to the backend API.

#### Scenario: Successful creation
- **WHEN** user clicks "Create Invoice" with valid data
- **THEN** system calls POST /api/v1/sales/invoices
- **AND** navigates to the new invoice's detail page
- **AND** displays success message "Invoice created successfully"

#### Scenario: Handle API error
- **WHEN** API returns an error
- **THEN** system displays error message from API response

#### Scenario: Loading state
- **WHEN** form is submitting
- **THEN** system disables submit button and shows loading indicator

### Requirement: Edit invoice page
The system SHALL provide a form page at `/sales/invoices/[id]/edit` for editing draft invoices.

#### Scenario: Load existing invoice
- **WHEN** user navigates to edit page
- **THEN** system fetches invoice data by ID
- **AND** populates form with existing values

#### Scenario: Edit only draft invoices
- **WHEN** user tries to access edit page for non-DRAFT invoice
- **THEN** system redirects to detail page
- **AND** displays message "Only draft invoices can be edited"

#### Scenario: Successful update
- **WHEN** user clicks "Save Changes" with valid data
- **THEN** system calls PUT /api/v1/sales/invoices/:id
- **AND** navigates to the invoice's detail page
- **AND** displays success message "Invoice updated successfully"

### Requirement: Link invoice to sales order
The system SHALL support linking invoices to sales orders.

#### Scenario: Pre-fill from sales order
- **WHEN** invoice is created from a sales order (via order detail page)
- **THEN** system pre-fills customer, line items, and salesOrderId
- **AND** displays link to source order

#### Scenario: Display linked order
- **WHEN** editing invoice linked to an order
- **THEN** system displays read-only link to the source sales order
