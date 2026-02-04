## ADDED Requirements

### Requirement: Create payment page
The system SHALL provide a form page at `/sales/payments/new` for recording customer payments.

#### Scenario: Navigate to create form
- **WHEN** user clicks "Record Payment" button on payments list page
- **THEN** system navigates to `/sales/payments/new`
- **AND** displays empty payment form

#### Scenario: Navigate from invoice
- **WHEN** user clicks "Record Payment" from invoice detail page
- **THEN** system navigates to `/sales/payments/new?invoiceId={id}`
- **AND** pre-selects the invoice in allocation table

#### Scenario: Page layout
- **WHEN** user views the create payment page
- **THEN** system displays a two-column layout with form on left and allocation on right
- **AND** displays header with "Record Payment" title and back button

### Requirement: Customer selection for payment
The system SHALL allow users to select a customer for the payment.

#### Scenario: Search for customer
- **WHEN** user types in customer select field
- **THEN** system displays matching customers from API search

#### Scenario: Customer required
- **WHEN** user attempts to submit form without selecting customer
- **THEN** system displays validation error "Please select a customer"

#### Scenario: Customer selection loads invoices
- **WHEN** user selects a customer
- **THEN** system fetches unpaid invoices for that customer
- **AND** displays invoices in allocation table

### Requirement: Payment details
The system SHALL capture payment details.

#### Scenario: Set payment date
- **WHEN** user selects payment date
- **THEN** system stores the selected date (defaults to today)

#### Scenario: Enter payment amount
- **WHEN** user enters payment amount
- **THEN** system validates amount is greater than 0
- **AND** displays amount in summary

#### Scenario: Select payment method
- **WHEN** user selects payment method
- **THEN** system stores the method (Cash, Bank Transfer, Check, Credit Card, Other)

#### Scenario: Enter reference number
- **WHEN** user enters reference number
- **THEN** system stores the reference (e.g., check number, bank reference)

#### Scenario: Add payment notes
- **WHEN** user enters notes
- **THEN** system stores notes with the payment

### Requirement: Invoice allocation
The system SHALL allow allocating payment to multiple invoices.

#### Scenario: Display unpaid invoices
- **WHEN** customer is selected
- **THEN** system displays table of unpaid invoices with columns: Invoice #, Date, Due Date, Total, Balance, Allocate
- **AND** sorts invoices by due date (oldest first)

#### Scenario: Allocate amount to invoice
- **WHEN** user enters amount in allocate column for an invoice
- **THEN** system validates amount does not exceed invoice balance
- **AND** updates total allocated amount

#### Scenario: Auto-allocate button
- **WHEN** user clicks "Auto-allocate" button
- **THEN** system automatically distributes payment amount to invoices by due date
- **AND** allocates oldest invoices first

#### Scenario: Clear allocations
- **WHEN** user clicks "Clear All" button
- **THEN** system clears all allocation amounts

### Requirement: Allocation validation
The system SHALL validate payment allocations.

#### Scenario: Total allocation must match payment
- **WHEN** user attempts to submit with allocations not equaling payment amount
- **THEN** system displays validation error "Total allocations must equal payment amount"
- **AND** displays difference amount

#### Scenario: Allocation cannot exceed invoice balance
- **WHEN** user enters allocation amount greater than invoice balance
- **THEN** system displays validation error for that row
- **AND** prevents form submission

#### Scenario: At least one allocation required
- **WHEN** user attempts to submit with no allocations
- **THEN** system displays validation error "At least one invoice must be allocated"

### Requirement: Payment summary
The system SHALL display a payment summary.

#### Scenario: Display summary
- **WHEN** user is on create payment page
- **THEN** system displays: Payment Amount, Total Allocated, Remaining to Allocate
- **AND** updates in real-time as allocations change

### Requirement: Submit payment
The system SHALL submit the payment to the backend API.

#### Scenario: Successful creation
- **WHEN** user clicks "Record Payment" with valid data and balanced allocations
- **THEN** system calls POST /api/v1/sales/payments with allocations array
- **AND** navigates to the new payment's detail page
- **AND** displays success message "Payment recorded successfully"

#### Scenario: Handle API error
- **WHEN** API returns an error
- **THEN** system displays error message from API response

#### Scenario: Loading state
- **WHEN** form is submitting
- **THEN** system disables submit button and shows loading indicator

### Requirement: Payment detail page
The system SHALL provide a detail page at `/sales/payments/[id]` for viewing payments.

#### Scenario: Navigate to detail page
- **WHEN** user clicks payment number link in payments list
- **THEN** system navigates to `/sales/payments/[id]`

#### Scenario: Display payment details
- **WHEN** user views payment detail page
- **THEN** system displays: Payment number, Date, Customer, Amount, Method, Reference
- **AND** displays back button to payments list

#### Scenario: Display allocations
- **WHEN** user views payment detail page
- **THEN** system displays table of invoice allocations: Invoice #, Amount Applied
- **AND** invoice numbers are clickable links to invoice detail
