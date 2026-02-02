## 1. Sales Orders Module (Backend)

- [x] 1.1 Create sales module structure
- [x] 1.2 Create CreateSalesOrderDto with line items
- [x] 1.3 Implement create sales order with stock reservation
- [x] 1.4 Implement list sales orders with filters
- [x] 1.5 Implement get sales order with items
- [x] 1.6 Implement confirm order (lock items)
- [x] 1.7 Implement ship order (reduce stock)
- [x] 1.8 Implement cancel order with stock rollback
- [x] 1.9 Add order number generation

## 2. Invoices Module (Backend)

- [x] 2.1 Create CreateInvoiceDto
- [x] 2.2 Implement create invoice from sales order
- [x] 2.3 Implement direct invoice creation
- [x] 2.4 Implement list invoices with filters
- [x] 2.5 Implement get invoice with items
- [x] 2.6 Implement send invoice (update status)
- [x] 2.7 Implement void invoice
- [x] 2.8 Add invoice number generation

## 3. Sales Payments Module (Backend)

- [x] 3.1 Create CreatePaymentDto
- [x] 3.2 Implement record payment against invoice
- [x] 3.3 Implement list payments with filters
- [x] 3.4 Implement get payment details
- [x] 3.5 Update invoice balance on payment
- [x] 3.6 Add payment number generation

## 4. Purchase Orders Module (Backend)

- [x] 4.1 Create purchases module structure
- [x] 4.2 Create CreatePurchaseOrderDto with line items
- [x] 4.3 Implement create purchase order
- [x] 4.4 Implement list purchase orders with filters
- [x] 4.5 Implement get purchase order
- [x] 4.6 Implement issue purchase order
- [x] 4.7 Implement cancel purchase order
- [x] 4.8 Add PO number generation

## 5. Purchase Receives Module (Backend)

- [x] 5.1 Create CreateReceiveDto
- [x] 5.2 Implement create receive from PO
- [x] 5.3 Implement list receives with filters
- [x] 5.4 Implement receive items (increase stock)
- [x] 5.5 Add receive number generation

## 6. Bills Module (Backend)

- [x] 6.1 Create CreateBillDto
- [x] 6.2 Implement create bill from PO
- [x] 6.3 Implement list bills with filters
- [x] 6.4 Implement get bill with items
- [x] 6.5 Implement approve bill
- [x] 6.6 Add bill number generation

## 7. Purchase Payments Module (Backend)

- [x] 7.1 Create purchase payment DTO
- [x] 7.2 Implement record vendor payment
- [x] 7.3 Implement list vendor payments
- [x] 7.4 Update bill balance on payment

## 8. Tax Module (Backend)

- [x] 8.1 Create tax module structure
- [x] 8.2 Create CreateTaxRateDto
- [x] 8.3 Implement list tax rates
- [x] 8.4 Implement create/update tax rate
- [x] 8.5 Implement delete tax rate
- [x] 8.6 Implement tax calculation service
- [x] 8.7 Add Malaysian SST tax types

## 9. E-Invoice Module (Backend)

- [x] 9.1 Create einvoice module structure
- [x] 9.2 Implement MyInvois API service stub
- [x] 9.3 Implement submit invoice endpoint
- [x] 9.4 Implement bulk submit endpoint
- [x] 9.5 Implement get submission status
- [x] 9.6 Implement pending submissions list
- [x] 9.7 Implement cancel submission
- [x] 9.8 Add e-invoice report endpoint

## 10. Dashboard Module (Backend)

- [x] 10.1 Create dashboard module structure
- [x] 10.2 Implement dashboard summary endpoint
- [x] 10.3 Implement sales trend chart data
- [x] 10.4 Implement top selling items
- [x] 10.5 Implement top customers
- [x] 10.6 Implement alerts (low stock, overdue)

## 11. Reports Module (Backend)

- [x] 11.1 Create reports module structure
- [x] 11.2 Implement sales summary report
- [x] 11.3 Implement sales by customer report
- [x] 11.4 Implement sales by item report
- [x] 11.5 Implement receivables aging report
- [x] 11.6 Implement inventory summary report
- [x] 11.7 Implement inventory valuation report
- [x] 11.8 Implement stock movement report
- [x] 11.9 Implement purchases summary report
- [x] 11.10 Implement purchases by vendor report
- [x] 11.11 Implement payables aging report

## 12. Sales Frontend

- [x] 12.1 Create sales orders list page
- [x] 12.2 Create invoices list page
- [x] 12.3 Create payments list page
- [ ] 12.4 Create sales order detail page
- [ ] 12.5 Create sales order create form
- [ ] 12.6 Create invoice detail page
- [ ] 12.7 Create payment recording form

## 13. Purchases Frontend

- [x] 13.1 Create purchase orders list page
- [x] 13.2 Create bills list page
- [x] 13.3 Create payments list page
- [ ] 13.4 Create purchase order detail page
- [ ] 13.5 Create purchase order create form
- [ ] 13.6 Create bill detail page
- [ ] 13.7 Create vendor payment form

## 14. Dashboard Frontend

- [x] 14.1 Create dashboard page with KPI cards
- [ ] 14.2 Add sales trend chart
- [ ] 14.3 Add top items widget
- [ ] 14.4 Add alerts widget

## 15. Reports Frontend

- [x] 15.1 Create reports page with report list
- [ ] 15.2 Add report filters and date range
- [ ] 15.3 Add export to Excel/PDF

## 16. API Integration & Hooks

- [x] 16.1 Create useSales hook
- [x] 16.2 Create usePurchases hook
- [ ] 16.3 Create useDashboard hook
- [ ] 16.4 Create useReports hook
