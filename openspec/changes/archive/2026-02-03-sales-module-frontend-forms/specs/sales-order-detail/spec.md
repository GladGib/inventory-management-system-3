## ADDED Requirements

### Requirement: Sales order detail page
The system SHALL provide a detail page at `/sales/orders/[id]` for viewing sales orders.

#### Scenario: Navigate to detail page
- **WHEN** user clicks order number link in orders list
- **THEN** system navigates to `/sales/orders/[id]`
- **AND** displays the order detail page

#### Scenario: Load order data
- **WHEN** user views order detail page
- **THEN** system fetches order by ID from GET /api/v1/sales/orders/:id
- **AND** displays loading state while fetching

#### Scenario: Handle not found
- **WHEN** order ID does not exist
- **THEN** system displays "Order not found" error
- **AND** provides link back to orders list

### Requirement: Order header display
The system SHALL display order header information.

#### Scenario: Display header
- **WHEN** user views order detail page
- **THEN** system displays: Order number, Status tag, Customer name, Order date, Expected ship date
- **AND** displays back button to orders list

### Requirement: Status workflow actions
The system SHALL display action buttons based on order status.

#### Scenario: Draft order actions
- **WHEN** order status is DRAFT
- **THEN** system displays buttons: Edit, Confirm Order, Cancel Order

#### Scenario: Confirmed order actions
- **WHEN** order status is CONFIRMED
- **THEN** system displays buttons: Ship Order, Create Invoice, Cancel Order

#### Scenario: Shipped order actions
- **WHEN** order status is SHIPPED
- **THEN** system displays buttons: Mark Delivered, Create Invoice

#### Scenario: Delivered order actions
- **WHEN** order status is DELIVERED
- **THEN** system displays buttons: Close Order, Create Invoice (if not fully invoiced)

#### Scenario: Closed/Cancelled order
- **WHEN** order status is CLOSED or CANCELLED
- **THEN** system displays no action buttons (read-only view)

### Requirement: Confirm order action
The system SHALL allow confirming draft orders.

#### Scenario: Confirm with modal
- **WHEN** user clicks "Confirm Order" button
- **THEN** system displays confirmation modal
- **AND** on confirm, calls PUT /api/v1/sales/orders/:id/confirm
- **AND** displays success message and refreshes page

### Requirement: Ship order action
The system SHALL allow marking confirmed orders as shipped.

#### Scenario: Ship with modal
- **WHEN** user clicks "Ship Order" button
- **THEN** system displays confirmation modal
- **AND** on confirm, calls PUT /api/v1/sales/orders/:id/ship
- **AND** displays success message and refreshes page

### Requirement: Deliver order action
The system SHALL allow marking shipped orders as delivered.

#### Scenario: Deliver with modal
- **WHEN** user clicks "Mark Delivered" button
- **THEN** system displays confirmation modal
- **AND** on confirm, calls PUT /api/v1/sales/orders/:id/deliver
- **AND** displays success message and refreshes page

### Requirement: Cancel order action
The system SHALL allow cancelling draft or confirmed orders.

#### Scenario: Cancel with warning modal
- **WHEN** user clicks "Cancel Order" button
- **THEN** system displays warning modal with danger styling
- **AND** on confirm, calls PUT /api/v1/sales/orders/:id/cancel
- **AND** displays success message and refreshes page

### Requirement: Create invoice from order
The system SHALL allow creating invoices from orders.

#### Scenario: Create invoice action
- **WHEN** user clicks "Create Invoice" button
- **THEN** system calls POST /api/v1/sales/orders/:id/invoice
- **AND** navigates to the new invoice's detail page
- **AND** displays success message "Invoice created from order"

### Requirement: Line items display
The system SHALL display order line items in a table.

#### Scenario: Display line items
- **WHEN** user views order detail page
- **THEN** system displays table with columns: Item, Description, Qty, Unit Price, Discount, Tax, Amount
- **AND** displays each line item from the order

### Requirement: Order totals display
The system SHALL display order totals summary.

#### Scenario: Display totals
- **WHEN** user views order detail page
- **THEN** system displays summary section with: Subtotal, Discount, Shipping, Tax, Total
- **AND** formats amounts in Malaysian Ringgit (RM)

### Requirement: Invoice status display
The system SHALL display invoice status for the order.

#### Scenario: Show invoice status
- **WHEN** user views order detail page
- **THEN** system displays invoice status badge (Not Invoiced, Partially Invoiced, Invoiced)

#### Scenario: Link to invoices
- **WHEN** order has related invoices
- **THEN** system displays list of linked invoices with clickable links
