# Sales Returns

## Overview
Process customer returns and generate credit notes for refunds or adjustments.

## Requirements

### RET-001: Create Sales Return
- **Priority**: P0
- **Description**: Record items returned by customer
- **Acceptance Criteria**:
  - Auto-generate return number (RET-XXXXXX)
  - Link to original invoice/sales order
  - Specify items and quantities returned
  - Select return reason
  - Choose return action (credit note, refund, exchange)
  - Update inventory on receipt

### RET-002: Return Reasons
- **Priority**: P0
- **Description**: Predefined return reason codes
- **Acceptance Criteria**:
  - Defective/Damaged
  - Wrong Item Sent
  - Customer Changed Mind
  - Not as Described
  - Quality Issue
  - Duplicate Order
  - Other (with notes)

### RET-003: Return Processing
- **Priority**: P0
- **Description**: Handle return workflow
- **Acceptance Criteria**:
  - PENDING: Return initiated
  - APPROVED: Return accepted
  - RECEIVED: Items received back
  - PROCESSED: Credit/refund issued
  - REJECTED: Return declined
  - Track quality inspection

### RET-004: Inventory Restoration
- **Priority**: P0
- **Description**: Return items to inventory
- **Acceptance Criteria**:
  - Return to original warehouse
  - Mark as restockable or damaged
  - Create stock adjustment for damaged items
  - Update stock levels

### RET-005: Credit Note Generation
- **Priority**: P0
- **Description**: Auto-generate credit note from return
- **Acceptance Criteria**:
  - Calculate credit amount based on returned items
  - Include original pricing and taxes
  - Apply credit to customer account
  - Option to issue refund directly

## API Endpoints

```
POST   /api/sales/returns           - Create return
GET    /api/sales/returns           - List returns
GET    /api/sales/returns/:id       - Get return details
PUT    /api/sales/returns/:id       - Update return
PUT    /api/sales/returns/:id/approve  - Approve return
PUT    /api/sales/returns/:id/receive  - Mark items received
PUT    /api/sales/returns/:id/process  - Process credit/refund
PUT    /api/sales/returns/:id/reject   - Reject return
```

## Database Schema

```prisma
model SalesReturn {
  id              String            @id @default(cuid())
  returnNumber    String            @unique
  invoiceId       String?
  invoice         Invoice?          @relation(fields: [invoiceId], references: [id])
  salesOrderId    String?
  salesOrder      SalesOrder?       @relation(fields: [salesOrderId], references: [id])
  customerId      String
  customer        Contact           @relation(fields: [customerId], references: [id])
  returnDate      DateTime
  status          ReturnStatus      @default(PENDING)
  reason          ReturnReason
  notes           String?
  subtotal        Decimal
  taxAmount       Decimal
  total           Decimal
  creditNoteId    String?
  creditNote      CreditNote?       @relation(fields: [creditNoteId], references: [id])
  items           SalesReturnItem[]
  warehouseId     String?
  restockItems    Boolean           @default(true)
  organizationId  String
  createdById     String
  approvedById    String?
  approvedAt      DateTime?
  receivedById    String?
  receivedAt      DateTime?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
}

model SalesReturnItem {
  id              String       @id @default(cuid())
  salesReturnId   String
  salesReturn     SalesReturn  @relation(fields: [salesReturnId], references: [id])
  itemId          String
  item            Item         @relation(fields: [itemId], references: [id])
  quantity        Decimal
  unitPrice       Decimal
  taxAmount       Decimal
  total           Decimal
  condition       ItemCondition @default(GOOD)
  restocked       Boolean       @default(false)
}

enum ReturnStatus {
  PENDING
  APPROVED
  RECEIVED
  PROCESSED
  REJECTED
}

enum ReturnReason {
  DEFECTIVE
  WRONG_ITEM
  CHANGED_MIND
  NOT_AS_DESCRIBED
  QUALITY_ISSUE
  DUPLICATE_ORDER
  OTHER
}

enum ItemCondition {
  GOOD
  DAMAGED
  DEFECTIVE
}
```
