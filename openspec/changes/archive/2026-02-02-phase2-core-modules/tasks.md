## 1. Categories Module (Backend)

- [ ] 1.1 Create categories module structure (module, controller, service)
- [ ] 1.2 Create CreateCategoryDto and UpdateCategoryDto with validation
- [ ] 1.3 Implement category tree retrieval with recursive children
- [ ] 1.4 Implement create category with parent validation
- [ ] 1.5 Implement update category with circular reference check
- [ ] 1.6 Implement delete category with item/children validation
- [ ] 1.7 Add item count to category responses
- [ ] 1.8 Register CategoriesModule in AppModule

## 2. Items Module (Backend)

- [ ] 2.1 Create items module structure (module, controller, service)
- [ ] 2.2 Create CreateItemDto with all fields and validation
- [ ] 2.3 Create UpdateItemDto with partial fields
- [ ] 2.4 Create ItemQueryDto for filtering and pagination
- [ ] 2.5 Implement list items with pagination and filtering
- [ ] 2.6 Implement full-text search on name, SKU, partNumber
- [ ] 2.7 Implement create item with SKU uniqueness check
- [ ] 2.8 Implement get item with stock levels and category
- [ ] 2.9 Implement update item with SKU conflict check
- [ ] 2.10 Implement soft delete item with stock validation
- [ ] 2.11 Add search index migration for PostgreSQL full-text search
- [ ] 2.12 Register ItemsModule in AppModule

## 3. Item Groups Module (Backend)

- [ ] 3.1 Create item-groups module structure
- [ ] 3.2 Create CreateItemGroupDto with attribute definitions
- [ ] 3.3 Implement list item groups with variant counts
- [ ] 3.4 Implement create item group
- [ ] 3.5 Implement add item to group with attribute values
- [ ] 3.6 Implement update item group
- [ ] 3.7 Implement delete item group (unlink items)

## 4. Warehouses Module (Backend)

- [ ] 4.1 Create warehouses module structure
- [ ] 4.2 Create CreateWarehouseDto and UpdateWarehouseDto
- [ ] 4.3 Implement list warehouses with stock summary
- [ ] 4.4 Implement create warehouse with code uniqueness
- [ ] 4.5 Implement update warehouse
- [ ] 4.6 Implement set default warehouse
- [ ] 4.7 Implement delete warehouse with stock validation
- [ ] 4.8 Implement warehouse status (activate/deactivate)

## 5. Stock Tracking Module (Backend)

- [ ] 5.1 Create inventory module structure
- [ ] 5.2 Create StockService for stock level operations
- [ ] 5.3 Implement list stock levels with filters
- [ ] 5.4 Implement get item stock across warehouses
- [ ] 5.5 Implement available stock calculation
- [ ] 5.6 Implement low stock items endpoint
- [ ] 5.7 Implement stock valuation calculation

## 6. Inventory Adjustments Module (Backend)

- [ ] 6.1 Create AdjustmentsService
- [ ] 6.2 Create CreateAdjustmentDto with reason codes
- [ ] 6.3 Implement create adjustment with stock update
- [ ] 6.4 Implement list adjustments with filters
- [ ] 6.5 Implement bulk adjustment endpoint
- [ ] 6.6 Add adjustment audit fields (createdBy, timestamps)

## 7. Inventory Transfers Module (Backend)

- [ ] 7.1 Create TransfersService
- [ ] 7.2 Create CreateTransferDto with line items
- [ ] 7.3 Implement create transfer (DRAFT status)
- [ ] 7.4 Implement issue transfer (decrease source stock)
- [ ] 7.5 Implement receive transfer (increase destination stock)
- [ ] 7.6 Implement cancel transfer with stock rollback
- [ ] 7.7 Implement list transfers with filters
- [ ] 7.8 Add transfer number generation

## 8. Contacts Module (Backend)

- [ ] 8.1 Create contacts module structure
- [ ] 8.2 Create CreateContactDto with all fields
- [ ] 8.3 Create UpdateContactDto
- [ ] 8.4 Create ContactQueryDto for filtering
- [ ] 8.5 Implement list contacts with type filter
- [ ] 8.6 Implement search contacts
- [ ] 8.7 Implement create contact (customer/vendor/both)
- [ ] 8.8 Implement get contact with balance
- [ ] 8.9 Implement update contact
- [ ] 8.10 Implement soft delete contact
- [ ] 8.11 Add customer alias endpoint (/customers)
- [ ] 8.12 Add vendor alias endpoint (/vendors)

## 9. File Uploads Module (Backend)

- [ ] 9.1 Create uploads module structure
- [ ] 9.2 Configure MinIO client service
- [ ] 9.3 Implement presigned URL generation for upload
- [ ] 9.4 Implement confirm upload endpoint
- [ ] 9.5 Implement delete file endpoint
- [ ] 9.6 Add file type and size validation
- [ ] 9.7 Implement file path organization by tenant/entity

## 10. Categories Frontend

- [ ] 10.1 Create categories list page with tree view
- [ ] 10.2 Create category create/edit modal
- [ ] 10.3 Implement drag-and-drop for category reordering
- [ ] 10.4 Add category delete confirmation with validation

## 11. Items Frontend

- [ ] 11.1 Update items list page with real API integration
- [ ] 11.2 Add advanced filter panel (category, status, type, price range)
- [ ] 11.3 Create item detail page with tabs (Overview, Stock, History)
- [ ] 11.4 Create item create form with all fields
- [ ] 11.5 Create item edit form
- [ ] 11.6 Add image upload component with preview
- [ ] 11.7 Add part number and cross-reference fields
- [ ] 11.8 Add vehicle compatibility selector

## 12. Item Groups Frontend

- [ ] 12.1 Create item groups list page
- [ ] 12.2 Create item group create form with attribute builder
- [ ] 12.3 Create variant matrix view
- [ ] 12.4 Add variant item to group modal

## 13. Warehouses Frontend

- [ ] 13.1 Create warehouses list page
- [ ] 13.2 Create warehouse create/edit form
- [ ] 13.3 Add set default warehouse action
- [ ] 13.4 Add warehouse stock summary view

## 14. Inventory Frontend

- [ ] 14.1 Update stock summary page with real API
- [ ] 14.2 Add warehouse filter dropdown
- [ ] 14.3 Create stock adjustment form
- [ ] 14.4 Create adjustments history page with filters
- [ ] 14.5 Create transfer create form (source, destination, items)
- [ ] 14.6 Create transfers list page with status badges
- [ ] 14.7 Add receive transfer action modal
- [ ] 14.8 Add low stock alerts widget

## 15. Customers Frontend

- [ ] 15.1 Update customers list page with real API
- [ ] 15.2 Create customer detail page with tabs (Overview, Transactions, Balance)
- [ ] 15.3 Create customer create form with address fields
- [ ] 15.4 Create customer edit form
- [ ] 15.5 Add credit limit and payment terms fields
- [ ] 15.6 Add outstanding balance display

## 16. Vendors Frontend

- [ ] 16.1 Create vendors list page
- [ ] 16.2 Create vendor detail page
- [ ] 16.3 Create vendor create form
- [ ] 16.4 Create vendor edit form
- [ ] 16.5 Add lead time and minimum order fields
- [ ] 16.6 Add outstanding balance display

## 17. API Integration & Hooks

- [ ] 17.1 Create useItems hook with React Query
- [ ] 17.2 Create useCategories hook
- [ ] 17.3 Create useWarehouses hook
- [ ] 17.4 Create useStockLevels hook
- [ ] 17.5 Create useAdjustments hook
- [ ] 17.6 Create useTransfers hook
- [ ] 17.7 Create useContacts hook (customers/vendors)
- [ ] 17.8 Create useFileUpload hook for image uploads

## 18. Testing & Documentation

- [ ] 18.1 Add unit tests for ItemsService
- [ ] 18.2 Add unit tests for StockService
- [ ] 18.3 Add unit tests for ContactsService
- [ ] 18.4 Add integration tests for inventory adjustments
- [ ] 18.5 Add integration tests for transfers workflow
- [ ] 18.6 Update Swagger documentation for all new endpoints
