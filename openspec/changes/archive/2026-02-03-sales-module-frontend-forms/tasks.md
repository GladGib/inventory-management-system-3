## 1. Shared Components

- [x] 1.1 Create `LineItemsTable` component for editable line items (shared between orders and invoices)
- [x] 1.2 Create `OrderSummary` component for totals sidebar (subtotal, discount, tax, total)
- [x] 1.3 Create `CustomerSelect` component with search and customer display
- [x] 1.4 Create `ItemSelect` component with search and auto-fill unit price

## 2. Sales Order Form

- [x] 2.1 Create `/sales/orders/new/page.tsx` with two-column layout
- [x] 2.2 Implement customer selection with validation
- [x] 2.3 Implement line items management (add, edit, remove rows)
- [x] 2.4 Implement order-level discount (percentage/fixed)
- [x] 2.5 Implement shipping charges field
- [x] 2.6 Implement order date and expected ship date fields
- [x] 2.7 Implement warehouse selection
- [x] 2.8 Implement notes and terms fields
- [x] 2.9 Connect form to `useCreateSalesOrder` mutation
- [x] 2.10 Create `/sales/orders/[id]/edit/page.tsx` with pre-populated form
- [x] 2.11 Implement edit-only-draft validation with redirect

## 3. Sales Order Detail

- [x] 3.1 Create `/sales/orders/[id]/page.tsx` with header and status display
- [x] 3.2 Implement status-based action buttons (Confirm, Ship, Deliver, Cancel)
- [x] 3.3 Implement confirmation modals for status actions
- [x] 3.4 Implement "Create Invoice" action with navigation
- [x] 3.5 Display line items table (read-only)
- [x] 3.6 Display order totals summary
- [x] 3.7 Display invoice status and linked invoices

## 4. Invoice Form

- [x] 4.1 Create `/sales/invoices/new/page.tsx` with two-column layout
- [x] 4.2 Implement customer selection with validation
- [x] 4.3 Implement line items management (reuse LineItemsTable)
- [x] 4.4 Implement invoice date and due date fields with validation
- [x] 4.5 Implement invoice-level discount
- [x] 4.6 Connect form to `useCreateInvoice` mutation
- [x] 4.7 Create `/sales/invoices/[id]/edit/page.tsx` with pre-populated form
- [x] 4.8 Implement edit-only-draft validation with redirect
- [x] 4.9 Handle pre-fill from sales order (via query param or redirect)

## 5. Invoice Detail

- [x] 5.1 Create `/sales/invoices/[id]/page.tsx` with header and status display
- [x] 5.2 Implement status-based action buttons (Send, Void, Record Payment)
- [x] 5.3 Implement confirmation modals for status actions
- [x] 5.4 Display line items table (read-only)
- [x] 5.5 Display invoice totals with amount paid and balance
- [x] 5.6 Display payment progress bar and status badge
- [x] 5.7 Display related payments table with links
- [x] 5.8 Display linked sales order if applicable

## 6. Payment Form

- [x] 6.1 Create `/sales/payments/new/page.tsx` with form and allocation layout
- [x] 6.2 Implement customer selection that loads unpaid invoices
- [x] 6.3 Implement payment details (date, amount, method, reference, notes)
- [x] 6.4 Implement invoice allocation table with editable amount column
- [x] 6.5 Implement auto-allocate functionality (oldest invoices first)
- [x] 6.6 Implement allocation validation (must equal payment amount)
- [x] 6.7 Implement payment summary display
- [x] 6.8 Connect form to `useCreatePayment` mutation
- [x] 6.9 Handle pre-selection from invoice (via query param)

## 7. Payment Detail

- [x] 7.1 Create `/sales/payments/[id]/page.tsx` with payment info display
- [x] 7.2 Display payment header (number, date, customer, amount, method)
- [x] 7.3 Display allocations table with invoice links

## 8. Testing & Polish

- [ ] 8.1 Test complete sales order workflow (create, confirm, ship, invoice)
- [ ] 8.2 Test complete invoice workflow (create, send, payment)
- [ ] 8.3 Test payment allocation with multiple invoices
- [ ] 8.4 Verify Malaysian Ringgit (RM) formatting throughout
- [ ] 8.5 Verify form validation messages are clear
- [ ] 8.6 Test navigation and back buttons work correctly
