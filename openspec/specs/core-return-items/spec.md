# Core/Return Items Management

## Overview
Manage core charges and core returns for remanufacturable auto parts such as alternators, starters, compressors, brake calipers, and power steering pumps. When selling these items, a core charge (deposit) is added to the invoice. The customer returns the old core unit and receives a credit. This is a standard practice in the auto parts industry and must be tracked separately from regular sales returns.

## Scope
- **In Scope**: Core item fields on Item model, core charges on invoices/sales orders, CoreReturn model and tracking, core return processing, customer core deposit balance, frontend indicators and management pages
- **Out of Scope**: Core grading/quality inspection workflow, vendor core returns (returning cores to the remanufacturer), core inventory valuation reports

## Requirements

### CR-001: Core Item Fields on Item Model
- **Priority**: P0
- **Description**: Add core-related fields to the existing Item model
- **Acceptance Criteria**:
  - `hasCore` (Boolean, default false): indicates this item has a returnable core
  - `coreCharge` (Decimal): the core deposit amount charged to the customer
  - `coreItemId` (String, nullable): optional self-reference to a separate "core" item in inventory
  - When `hasCore` is true, `coreCharge` must be > 0
  - coreItemId allows tracking core units as separate inventory items (optional advanced usage)
  - Core charge is always in the organization's base currency (MYR)

### CR-002: Core Charges on Sales Documents
- **Priority**: P0
- **Description**: Automatically add core charges as line items on invoices and sales orders
- **Acceptance Criteria**:
  - When adding an item with `hasCore=true` to a sales order or invoice, prompt to add core charge
  - Core charge appears as a separate line item (description: "Core Charge - [Item Name]")
  - Core charge is taxable based on organization settings (SST applies to core charges in Malaysia)
  - Core charge line items are visually distinct (tagged or labeled) from regular items
  - Core charge can be manually overridden or removed per line item
  - Totals include core charges in subtotal and tax calculations

### CR-003: CoreReturn Data Model
- **Priority**: P0
- **Description**: Track core returns from customers
- **Acceptance Criteria**:
  - CoreReturn model: id, coreReturnNumber, customerId, itemId, invoiceId (nullable), returnDate, status, coreCondition, creditAmount, notes, processedById, processedAt, organizationId
  - Status: PENDING, RECEIVED, INSPECTED, CREDITED, REJECTED
  - Core condition: GOOD, DAMAGED, MISSING_PARTS, NOT_REBUILDABLE
  - Credit amount can differ from original core charge (e.g., damaged core gets partial credit)
  - Link to original invoice for traceability
  - Organization-scoped

### CR-004: Core Return CRUD API
- **Priority**: P0
- **Description**: Full API for managing core returns
- **Acceptance Criteria**:
  - POST /core-returns - create a new core return record
  - GET /core-returns - list core returns with filters (status, customerId, dateRange)
  - GET /core-returns/:id - get core return detail
  - PUT /core-returns/:id - update core return
  - PUT /core-returns/:id/receive - mark core as received (set status to RECEIVED)
  - PUT /core-returns/:id/inspect - record inspection result (condition, credit amount)
  - PUT /core-returns/:id/credit - issue credit to customer (creates CreditNote or adjusts balance)
  - PUT /core-returns/:id/reject - reject core return with reason
  - Pagination, sorting, filtering support

### CR-005: Core Return Processing Workflow
- **Priority**: P0
- **Description**: Multi-step workflow for processing core returns
- **Acceptance Criteria**:
  - PENDING: Core return initiated (customer says they will return)
  - RECEIVED: Core physically received at warehouse
  - INSPECTED: Core inspected for condition, credit amount determined
  - CREDITED: Credit note or refund issued to customer
  - REJECTED: Core not accepted (wrong part, too damaged, etc.)
  - Each status transition logged with timestamp and user
  - Status can only move forward (no going back from CREDITED to RECEIVED)
  - REJECTED can happen from PENDING, RECEIVED, or INSPECTED states

### CR-006: Core Deposit Tracking on Customer Account
- **Priority**: P1
- **Description**: Track outstanding core deposits per customer
- **Acceptance Criteria**:
  - GET /contacts/:id/core-balance - returns total outstanding core charges for a customer
  - Calculate: sum of core charges on paid invoices minus sum of core credits issued
  - Show outstanding core deposit amount on customer detail page
  - Alert when customer has overdue core returns (configurable threshold, e.g., 30 days)
  - Core balance summary in customer contact detail page

### CR-007: CoreChargeIndicator Component
- **Priority**: P0
- **Description**: Visual indicator on item cards and lists showing core charge info
- **Acceptance Criteria**:
  - Small tag/badge on item cards: "Core: RM XX.XX"
  - Shown in items list, item detail, and when adding items to sales documents
  - Use a distinct color (e.g., orange) to draw attention
  - Tooltip with details: "This item has a core charge of RM XX.XX"

### CR-008: CoreReturnsList Page
- **Priority**: P0
- **Description**: Page to list and manage all core returns
- **Acceptance Criteria**:
  - Route: /inventory/core-returns
  - Ant Design Table with columns: Return #, Customer, Item, Return Date, Status, Condition, Credit Amount, Actions
  - Filters: status, customer, date range
  - Search by return number or customer name
  - Status tags with colors (PENDING=blue, RECEIVED=cyan, INSPECTED=orange, CREDITED=green, REJECTED=red)
  - Row click navigates to detail or opens drawer
  - "New Core Return" button

### CR-009: ReceiveCoreModal
- **Priority**: P0
- **Description**: Modal for receiving and processing a core return
- **Acceptance Criteria**:
  - Triggered from core returns list or customer detail
  - Step 1: Receive - confirm core received, record date
  - Step 2: Inspect - select condition, set credit amount (pre-filled from original core charge)
  - Step 3: Credit - confirm credit issuance, optional notes
  - Can complete all steps at once for simple cases
  - Uses Ant Design Steps component within modal

### CR-010: Core Return on Sales Order Form
- **Priority**: P1
- **Description**: Integration of core charges into the sales order creation flow
- **Acceptance Criteria**:
  - When an item with hasCore=true is added to a sales order:
    - Auto-add a core charge line item below it
    - Show info message: "Core charge of RM XX.XX will be added"
    - Allow user to remove the core charge line (opt-out)
  - Core charge line items have a special type/flag to distinguish them
  - In the saved SO/invoice, core lines are visually grouped with their parent item

## API Endpoints

```
# Core Returns
POST   /api/core-returns                   - Create core return
GET    /api/core-returns                   - List core returns (paginated, filterable)
GET    /api/core-returns/:id               - Get core return detail
PUT    /api/core-returns/:id               - Update core return
PUT    /api/core-returns/:id/receive       - Mark core as received
PUT    /api/core-returns/:id/inspect       - Record inspection result
PUT    /api/core-returns/:id/credit        - Issue credit for core return
PUT    /api/core-returns/:id/reject        - Reject core return

# Customer Core Balance
GET    /api/contacts/:id/core-balance      - Get customer's outstanding core balance

# Item Core Info (part of existing items endpoints)
# Core fields included in standard item CRUD responses
```

## Database Schema

### Changes to Item Model

```prisma
model Item {
  // ... existing fields ...

  // Core item fields
  hasCore     Boolean  @default(false)
  coreCharge  Decimal  @default(0) @db.Decimal(15, 2)
  coreItemId  String?  // Self-reference to core inventory item
  coreItem    Item?    @relation("CoreItem", fields: [coreItemId], references: [id])
  coreFor     Item[]   @relation("CoreItem") // Items that use this as a core

  // Core returns relation
  coreReturns CoreReturn[]
}
```

### New Models

```prisma
model CoreReturn {
  id                 String           @id @default(cuid())
  coreReturnNumber   String
  customerId         String
  customer           Contact          @relation("CoreReturnCustomer", fields: [customerId], references: [id])
  itemId             String
  item               Item             @relation(fields: [itemId], references: [id])
  invoiceId          String?          // Link to original invoice
  invoice            Invoice?         @relation("CoreReturnInvoice", fields: [invoiceId], references: [id])
  returnDate         DateTime         @default(now())
  status             CoreReturnStatus @default(PENDING)
  coreCondition      CoreCondition?
  originalCoreCharge Decimal          @db.Decimal(15, 2) // Original charge from invoice
  creditAmount       Decimal?         @db.Decimal(15, 2) // Actual credit issued (may differ)
  creditNoteId       String?          // Link to credit note if issued
  notes              String?
  rejectionReason    String?
  receivedById       String?
  receivedAt         DateTime?
  inspectedById      String?
  inspectedAt        DateTime?
  processedById      String?
  processedAt        DateTime?
  organizationId     String
  createdById        String?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  @@unique([organizationId, coreReturnNumber])
  @@index([organizationId])
  @@index([customerId])
  @@index([itemId])
  @@index([status])
  @@index([returnDate])
}

enum CoreReturnStatus {
  PENDING
  RECEIVED
  INSPECTED
  CREDITED
  REJECTED
}

enum CoreCondition {
  GOOD
  DAMAGED
  MISSING_PARTS
  NOT_REBUILDABLE
}
```

### Changes to Contact Model

```prisma
model Contact {
  // ... existing fields ...
  coreReturns CoreReturn[] @relation("CoreReturnCustomer")
}
```

### Changes to Invoice Model

```prisma
model Invoice {
  // ... existing fields ...
  coreReturns CoreReturn[] @relation("CoreReturnInvoice")
}
```

## DTOs

### CreateCoreReturnDto
```typescript
import { IsString, IsOptional, IsDateString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCoreReturnDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Item ID (the item with core charge)' })
  @IsString()
  itemId: string;

  @ApiPropertyOptional({ description: 'Original invoice ID' })
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @ApiPropertyOptional({ description: 'Return date' })
  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
```

### ReceiveCoreReturnDto
```typescript
export class ReceiveCoreReturnDto {
  @IsOptional()
  @IsDateString()
  receivedDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

### InspectCoreReturnDto
```typescript
export class InspectCoreReturnDto {
  @IsEnum(CoreCondition)
  coreCondition: CoreCondition;

  @IsNumber()
  @Min(0)
  creditAmount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

### CreditCoreReturnDto
```typescript
export class CreditCoreReturnDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  createCreditNote?: boolean; // true = create CN, false = just record credit
}
```

### RejectCoreReturnDto
```typescript
export class RejectCoreReturnDto {
  @IsString()
  rejectionReason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

## NestJS Module Structure

```
apps/api/src/modules/inventory/
├── core-returns/
│   ├── core-returns.controller.ts
│   ├── core-returns.service.ts
│   ├── core-returns.module.ts
│   └── dto/
│       ├── create-core-return.dto.ts
│       ├── receive-core-return.dto.ts
│       ├── inspect-core-return.dto.ts
│       ├── credit-core-return.dto.ts
│       └── reject-core-return.dto.ts
```

## Controller Implementation

```typescript
@ApiTags('Core Returns')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('core-returns')
export class CoreReturnsController {
  constructor(private readonly coreReturnsService: CoreReturnsService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create core return' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCoreReturnDto
  ) {
    return this.coreReturnsService.create(organizationId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List core returns' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.coreReturnsService.findAll(organizationId, {
      status, customerId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get core return detail' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.coreReturnsService.findOne(id, organizationId);
  }

  @Put(':id/receive')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Mark core as received' })
  async receive(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReceiveCoreReturnDto
  ) {
    return this.coreReturnsService.receive(id, organizationId, userId, dto);
  }

  @Put(':id/inspect')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Record inspection result' })
  async inspect(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: InspectCoreReturnDto
  ) {
    return this.coreReturnsService.inspect(id, organizationId, userId, dto);
  }

  @Put(':id/credit')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Issue credit for core return' })
  async credit(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreditCoreReturnDto
  ) {
    return this.coreReturnsService.credit(id, organizationId, userId, dto);
  }

  @Put(':id/reject')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Reject core return' })
  async reject(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RejectCoreReturnDto
  ) {
    return this.coreReturnsService.reject(id, organizationId, userId, dto);
  }
}
```

## Service Implementation

```typescript
@Injectable()
export class CoreReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, userId: string, dto: CreateCoreReturnDto) {
    // Validate item has core
    const item = await this.prisma.item.findFirst({
      where: { id: dto.itemId, organizationId, hasCore: true },
    });
    if (!item) throw new BadRequestException('Item not found or does not have a core charge');

    // Validate customer
    const customer = await this.prisma.contact.findFirst({
      where: { id: dto.customerId, organizationId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    // Generate core return number
    const lastReturn = await this.prisma.coreReturn.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { coreReturnNumber: true },
    });
    const nextNum = lastReturn
      ? parseInt(lastReturn.coreReturnNumber.split('-')[1]) + 1
      : 1;
    const coreReturnNumber = `CRT-${String(nextNum).padStart(6, '0')}`;

    return this.prisma.coreReturn.create({
      data: {
        coreReturnNumber,
        customerId: dto.customerId,
        itemId: dto.itemId,
        invoiceId: dto.invoiceId,
        returnDate: dto.returnDate ? new Date(dto.returnDate) : new Date(),
        originalCoreCharge: item.coreCharge,
        notes: dto.notes,
        organizationId,
        createdById: userId,
      },
      include: {
        customer: { select: { id: true, displayName: true } },
        item: { select: { id: true, sku: true, name: true, coreCharge: true } },
      },
    });
  }

  async receive(id: string, organizationId: string, userId: string, dto: ReceiveCoreReturnDto) {
    const coreReturn = await this.findOne(id, organizationId);

    if (coreReturn.status !== 'PENDING') {
      throw new BadRequestException('Core return can only be received from PENDING status');
    }

    return this.prisma.coreReturn.update({
      where: { id },
      data: {
        status: 'RECEIVED',
        receivedById: userId,
        receivedAt: dto.receivedDate ? new Date(dto.receivedDate) : new Date(),
        notes: dto.notes ? `${coreReturn.notes || ''}\nReceived: ${dto.notes}` : coreReturn.notes,
      },
    });
  }

  async inspect(id: string, organizationId: string, userId: string, dto: InspectCoreReturnDto) {
    const coreReturn = await this.findOne(id, organizationId);

    if (coreReturn.status !== 'RECEIVED') {
      throw new BadRequestException('Core return can only be inspected from RECEIVED status');
    }

    return this.prisma.coreReturn.update({
      where: { id },
      data: {
        status: 'INSPECTED',
        coreCondition: dto.coreCondition,
        creditAmount: dto.creditAmount,
        inspectedById: userId,
        inspectedAt: new Date(),
        notes: dto.notes ? `${coreReturn.notes || ''}\nInspection: ${dto.notes}` : coreReturn.notes,
      },
    });
  }

  async credit(id: string, organizationId: string, userId: string, dto: CreditCoreReturnDto) {
    const coreReturn = await this.findOne(id, organizationId);

    if (coreReturn.status !== 'INSPECTED') {
      throw new BadRequestException('Core return can only be credited from INSPECTED status');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update core return status
      const updated = await tx.coreReturn.update({
        where: { id },
        data: {
          status: 'CREDITED',
          processedById: userId,
          processedAt: new Date(),
          notes: dto.notes ? `${coreReturn.notes || ''}\nCredit: ${dto.notes}` : coreReturn.notes,
        },
      });

      // Optionally create credit note
      if (dto.createCreditNote) {
        // Generate credit note number and create CreditNote record
        // Similar to existing credit note creation logic
      }

      return updated;
    });
  }

  async reject(id: string, organizationId: string, userId: string, dto: RejectCoreReturnDto) {
    const coreReturn = await this.findOne(id, organizationId);

    if (['CREDITED', 'REJECTED'].includes(coreReturn.status)) {
      throw new BadRequestException('Core return cannot be rejected from current status');
    }

    return this.prisma.coreReturn.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: dto.rejectionReason,
        processedById: userId,
        processedAt: new Date(),
        notes: dto.notes ? `${coreReturn.notes || ''}\nRejected: ${dto.notes}` : coreReturn.notes,
      },
    });
  }

  async getCustomerCoreBalance(customerId: string, organizationId: string) {
    // Sum of core charges from paid invoices
    // Minus sum of credits issued for core returns
    const [chargesResult, creditsResult] = await Promise.all([
      this.prisma.coreReturn.aggregate({
        where: {
          customerId,
          organizationId,
          status: { not: 'REJECTED' },
        },
        _sum: { originalCoreCharge: true },
      }),
      this.prisma.coreReturn.aggregate({
        where: {
          customerId,
          organizationId,
          status: 'CREDITED',
        },
        _sum: { creditAmount: true },
      }),
    ]);

    const totalCharges = Number(chargesResult._sum.originalCoreCharge || 0);
    const totalCredits = Number(creditsResult._sum.creditAmount || 0);

    return {
      totalCoreCharges: totalCharges,
      totalCoreCredits: totalCredits,
      outstandingBalance: totalCharges - totalCredits,
    };
  }
}
```

## Frontend Components

### File Structure
```
apps/web/src/
├── app/(dashboard)/inventory/core-returns/
│   ├── page.tsx                          - Core returns list page
│   └── [id]/
│       └── page.tsx                      - Core return detail page (optional)
├── components/items/
│   └── CoreChargeIndicator.tsx           - Badge/tag showing core charge
├── components/core-returns/
│   ├── CoreReturnsList.tsx               - Table of core returns
│   ├── CreateCoreReturnModal.tsx         - Create new core return
│   ├── ReceiveCoreModal.tsx              - Multi-step receive/inspect/credit
│   └── CoreBalanceSummary.tsx            - Customer's core balance display
├── hooks/
│   └── use-core-returns.ts              - React Query hooks
└── lib/
    └── core-returns.ts                   - API client functions
```

### CoreChargeIndicator Component
```tsx
// apps/web/src/components/items/CoreChargeIndicator.tsx
import { Tag, Tooltip } from 'antd';

interface Props {
  hasCore: boolean;
  coreCharge: number;
}

export function CoreChargeIndicator({ hasCore, coreCharge }: Props) {
  if (!hasCore) return null;

  return (
    <Tooltip title={`This item has a core charge of RM ${coreCharge.toFixed(2)}`}>
      <Tag color="orange">Core: RM {coreCharge.toFixed(2)}</Tag>
    </Tooltip>
  );
}
```

### CoreReturnsList Page
```tsx
// Ant Design Table with:
// - Columns: Return #, Customer, Item, Return Date, Status, Condition, Credit Amount, Actions
// - Filters row: status select, customer select, date range picker
// - Search by return number
// - Status tags with colors
// - Actions: Receive, Inspect, Credit (based on current status)
// - New Core Return button -> opens CreateCoreReturnModal
```

### ReceiveCoreModal Component
```tsx
// Multi-step modal using Ant Design Steps:
// Step 1: Receive - confirm physical receipt, date picker
// Step 2: Inspect - condition select (GOOD/DAMAGED/MISSING_PARTS/NOT_REBUILDABLE),
//                   credit amount input (pre-filled from original charge),
//                   partial credit logic for damaged cores
// Step 3: Credit - confirm credit issuance, option to create credit note
// "Quick Process" button to complete all steps at once for GOOD condition cores
```

### CoreBalanceSummary Component
```tsx
// Shows on customer detail page (/contacts/[id]):
// - Total core charges outstanding
// - Total credits issued
// - Net balance
// - Ant Design Statistic components in a card
// - Warning alert if balance exceeds threshold
```

## Business Logic and Validation Rules

1. **Core charge requirement**: When `hasCore` is true, `coreCharge` must be greater than 0.
2. **Status transitions**: PENDING -> RECEIVED -> INSPECTED -> CREDITED. REJECTED can be reached from PENDING, RECEIVED, or INSPECTED. No backward transitions.
3. **Credit amount**: Cannot exceed the original core charge. For damaged cores, partial credit is allowed. For GOOD cores, full credit is the default.
4. **Auto-generate numbers**: Core return numbers use the format CRT-XXXXXX, auto-incremented per organization.
5. **Invoice linkage**: When creating a core return, the invoiceId is optional but recommended for traceability. The system should suggest recent invoices for the customer.
6. **Core charge on sales documents**: When an item with hasCore is added to a SO/invoice, the system should auto-suggest adding a core charge line item. This is a UX convenience, not a hard requirement.
7. **Organization isolation**: All core return data is organization-scoped.
8. **Customer balance calculation**: Outstanding core balance = sum(originalCoreCharge for non-rejected returns) - sum(creditAmount for CREDITED returns).
9. **Core items as inventory**: When coreItemId is set, receiving a core return could optionally increase stock of the core item. This is an advanced feature for organizations that track core inventory separately.

## Navigation Integration

Add to the sidebar navigation under "Inventory":

```
Inventory
├── Stock Levels
├── Adjustments
├── Transfers
├── Core Returns        <- NEW
└── Assemblies
```
