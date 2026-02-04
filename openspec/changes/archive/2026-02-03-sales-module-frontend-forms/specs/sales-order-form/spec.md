## ADDED Requirements

### Requirement: Create sales order page
The system SHALL provide a form page at `/sales/orders/new` for creating new sales orders.

#### Scenario: Navigate to create form
- **WHEN** user clicks "New Order" button on sales orders list page
- **THEN** system navigates to `/sales/orders/new`
- **AND** displays empty sales order form

#### Scenario: Page layout
- **WHEN** user views the create sales order page
- **THEN** system displays a two-column layout with form on left (16 cols) and summary on right (8 cols)
- **AND** displays header with "New Sales Order" title and back button

### Requirement: Customer selection
The system SHALL allow users to select a customer for the sales order.

#### Scenario: Search for customer
- **WHEN** user types in customer select field
- **THEN** system displays matching customers from API search
- **AND** shows customer display name and company name

#### Scenario: Select existing customer
- **WHEN** user selects a customer from dropdown
- **THEN** system populates customerId field
- **AND** displays selected customer name

#### Scenario: Customer required
- **WHEN** user attempts to submit form without selecting customer
- **THEN** system displays validation error "Please select a customer"

### Requirement: Line items management
The system SHALL allow users to add, edit, and remove line items.

#### Scenario: Add line item
- **WHEN** user clicks "Add Item" button
- **THEN** system adds a new empty row to the line items table
- **AND** focuses the item select field

#### Scenario: Select item for line
- **WHEN** user selects an item from the item dropdown
- **THEN** system populates itemId, item name, unit
- **AND** auto-fills unit price from item's selling price
- **AND** calculates row total

#### Scenario: Edit quantity
- **WHEN** user changes quantity for a line item
- **THEN** system recalculates row total (quantity * unitPrice - discount)
- **AND** recalculates order subtotal and total

#### Scenario: Edit unit price
- **WHEN** user changes unit price for a line item
- **THEN** system recalculates row total
- **AND** recalculates order subtotal and total

#### Scenario: Apply line discount
- **WHEN** user enters a discount percentage (0-100) for a line item
- **THEN** system applies percentage discount to row total
- **AND** recalculates order total

#### Scenario: Remove line item
- **WHEN** user clicks remove button on a line item row
- **THEN** system removes the row from the table
- **AND** recalculates order subtotal and total

#### Scenario: At least one item required
- **WHEN** user attempts to submit form with no line items
- **THEN** system displays validation error "At least one item is required"

### Requirement: Tax calculation
The system SHALL calculate taxes based on line item tax rates.

#### Scenario: Select tax rate per line
- **WHEN** user selects a tax rate for a line item
- **THEN** system calculates tax amount for that line
- **AND** updates total tax amount for the order

#### Scenario: Display tax breakdown
- **WHEN** order has items with different tax rates
- **THEN** system displays tax amount per line in the table
- **AND** displays total tax in the summary sidebar

### Requirement: Order-level discount
The system SHALL support order-level discounts.

#### Scenario: Apply percentage discount
- **WHEN** user selects "Percentage" discount type and enters a value
- **THEN** system applies percentage to subtotal
- **AND** displays discount amount in summary

#### Scenario: Apply fixed discount
- **WHEN** user selects "Fixed" discount type and enters a value
- **THEN** system subtracts fixed amount from subtotal
- **AND** displays discount amount in summary

### Requirement: Shipping charges
The system SHALL allow optional shipping charges.

#### Scenario: Add shipping charges
- **WHEN** user enters shipping charges amount
- **THEN** system adds amount to order total
- **AND** displays shipping in summary sidebar

### Requirement: Order summary sidebar
The system SHALL display a real-time order summary.

#### Scenario: Display totals
- **WHEN** user is on create/edit order page
- **THEN** system displays summary card with: Subtotal, Discount, Shipping, Tax, Total
- **AND** updates values in real-time as line items change

### Requirement: Additional order fields
The system SHALL support optional order metadata.

#### Scenario: Set order date
- **WHEN** user selects order date
- **THEN** system stores the selected date (defaults to today)

#### Scenario: Set expected ship date
- **WHEN** user selects expected ship date
- **THEN** system stores the expected shipping date

#### Scenario: Select warehouse
- **WHEN** user selects a warehouse
- **THEN** system assigns the order to that warehouse for fulfillment

#### Scenario: Add notes
- **WHEN** user enters notes in the notes field
- **THEN** system stores notes with the order

### Requirement: Submit sales order
The system SHALL submit the order to the backend API.

#### Scenario: Successful creation
- **WHEN** user clicks "Create Order" with valid data
- **THEN** system calls POST /api/v1/sales/orders
- **AND** navigates to the new order's detail page
- **AND** displays success message "Sales order created successfully"

#### Scenario: Handle API error
- **WHEN** API returns an error
- **THEN** system displays error message from API response
- **AND** form remains open with data preserved

#### Scenario: Loading state
- **WHEN** form is submitting
- **THEN** system disables submit button and shows loading indicator

### Requirement: Edit sales order page
The system SHALL provide a form page at `/sales/orders/[id]/edit` for editing draft orders.

#### Scenario: Load existing order
- **WHEN** user navigates to edit page
- **THEN** system fetches order data by ID
- **AND** populates form with existing values

#### Scenario: Edit only draft orders
- **WHEN** user tries to access edit page for non-DRAFT order
- **THEN** system redirects to detail page
- **AND** displays message "Only draft orders can be edited"

#### Scenario: Successful update
- **WHEN** user clicks "Save Changes" with valid data
- **THEN** system calls PUT /api/v1/sales/orders/:id
- **AND** navigates to the order's detail page
- **AND** displays success message "Sales order updated successfully"
