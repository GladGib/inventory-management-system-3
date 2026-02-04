# Sales Returns & Credit Notes UI

## Overview
Frontend interface for processing customer returns and generating credit notes.

## Requirements

### SR-001: Sales Returns List Page
- **Priority**: P1
- **Description**: List page showing all sales returns
- **Acceptance Criteria**:
  - Table with return number, customer, date, status, total
  - Filter by status, date range, customer
  - Search by return number
  - Create new return button
  - Status badges (Pending, Approved, Received, Processed, Rejected)

### SR-002: Create Sales Return
- **Priority**: P1
- **Description**: Form to create a new sales return
- **Acceptance Criteria**:
  - Select source (Invoice or Sales Order)
  - Auto-populate items from source
  - Adjust return quantities
  - Select return reason per item
  - Choose warehouse for returned items
  - Notes field
  - Restock option toggle

### SR-003: Sales Return Detail Page
- **Priority**: P1
- **Description**: View return details and process workflow
- **Acceptance Criteria**:
  - Return header info (number, date, status)
  - Customer information
  - Original document reference
  - Items table with quantities and conditions
  - Status workflow actions
  - Credit note link (if generated)
  - Activity timeline

### SR-004: Return Workflow Actions
- **Priority**: P1
- **Description**: Status transition buttons
- **Acceptance Criteria**:
  - Approve button (Pending → Approved)
  - Receive Items button (Approved → Received)
  - Process/Generate Credit Note (Received → Processed)
  - Reject button (any status → Rejected)
  - Confirmation dialogs for each action

### SR-005: Credit Note Generation
- **Priority**: P1
- **Description**: Auto-generate credit note from processed return
- **Acceptance Criteria**:
  - Generate credit note with return details
  - Calculate credit amount (items + tax)
  - Link credit note to return
  - Option to apply to customer balance
  - Option to issue refund

### SR-006: Credit Notes List
- **Priority**: P1
- **Description**: List page for credit notes
- **Acceptance Criteria**:
  - Table with credit number, customer, amount, status
  - Filter by status, date range
  - View credit note details
  - Apply to invoice action

## API Endpoints (Reference)

```
POST   /api/sales/returns           - Create return
GET    /api/sales/returns           - List returns
GET    /api/sales/returns/:id       - Get return details
PUT    /api/sales/returns/:id       - Update return
PUT    /api/sales/returns/:id/approve  - Approve return
PUT    /api/sales/returns/:id/receive  - Mark items received
PUT    /api/sales/returns/:id/process  - Process and generate credit note
PUT    /api/sales/returns/:id/reject   - Reject return

GET    /api/sales/credit-notes      - List credit notes
GET    /api/sales/credit-notes/:id  - Get credit note details
POST   /api/sales/credit-notes/:id/apply - Apply to invoice
```

## UI Components

### SalesReturnsPage
```tsx
// /sales/returns
- DataTable with returns
- Filters: status, dateRange, customer
- Actions: view, process
```

### SalesReturnForm
```tsx
interface SalesReturnFormProps {
  sourceType?: 'invoice' | 'salesOrder';
  sourceId?: string;
  onSuccess: () => void;
}

// Form sections:
// 1. Source Selection (Invoice/SO lookup)
// 2. Return Items (from source, adjust quantities)
// 3. Return Details (reason, warehouse, notes)
```

### ReturnItemsTable Component
```tsx
interface ReturnItemsTableProps {
  sourceItems: LineItem[];
  returnItems: ReturnLineItem[];
  onChange: (items: ReturnLineItem[]) => void;
}

interface ReturnLineItem {
  itemId: string;
  quantity: number;
  reason: ReturnReason;
  condition: ItemCondition;
}
```

### SalesReturnDetail Page
```tsx
// /sales/returns/[id]
// Sections:
// - Header with status badge and actions
// - Customer info card
// - Source document reference
// - Items table
// - Totals summary
// - Credit note (if processed)
// - Activity timeline
```

### WorkflowActions Component
```tsx
interface WorkflowActionsProps {
  return: SalesReturn;
  onAction: (action: ReturnAction) => void;
}

type ReturnAction = 'approve' | 'receive' | 'process' | 'reject';
```

## Navigation

```
Sales
├── Sales Orders
├── Invoices
├── Payments Received
└── Sales Returns     <-- Add to menu
    ├── List
    └── [id] Detail
```

## Return Reasons (UI Labels)

```typescript
const RETURN_REASONS = {
  DEFECTIVE: 'Defective/Damaged',
  WRONG_ITEM: 'Wrong Item Sent',
  CHANGED_MIND: 'Customer Changed Mind',
  NOT_AS_DESCRIBED: 'Not as Described',
  QUALITY_ISSUE: 'Quality Issue',
  DUPLICATE_ORDER: 'Duplicate Order',
  OTHER: 'Other',
};
```

## Item Conditions

```typescript
const ITEM_CONDITIONS = {
  GOOD: 'Good - Can Restock',
  DAMAGED: 'Damaged - Cannot Restock',
  DEFECTIVE: 'Defective - Return to Supplier',
};
```
