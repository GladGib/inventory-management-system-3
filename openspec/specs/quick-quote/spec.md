# Quick Quote for Walk-in Customers

## Overview
A streamlined quotation flow for counter sales at auto parts wholesale shops. Walk-in customers frequently ask for price quotes before deciding to purchase. This feature provides a fast way to create, print/send, and convert quotes into sales orders. Unlike formal sales orders, quotes can be created for anonymous walk-in customers (no contact record required), have an expiry date, and can be converted to orders with one click.

## Scope
- **In Scope**: Quote model and full CRUD, quote lifecycle (DRAFT to CONVERTED), walk-in customer support, PDF generation, quote-to-order conversion, auto-expiry, quick quote modal, quotes list page
- **Out of Scope**: Multi-currency quotes, recurring quotes, quote versioning/revisions, quote templates, integration with CRM systems

## Requirements

### QQ-001: Quote Data Model
- **Priority**: P0
- **Description**: Dedicated model for quotations
- **Acceptance Criteria**:
  - Quote model: id, quoteNumber, customerId (nullable for walk-ins), customerName (for walk-in display), customerPhone (for walk-in contact), customerEmail (optional), items, validUntil, status, convertedToOrderId, notes, termsConditions
  - Status: DRAFT, SENT, ACCEPTED, EXPIRED, CONVERTED, REJECTED
  - validUntil defaults to 7 days from creation (configurable per organization)
  - QuoteItem model: id, quoteId, itemId, description, quantity, unit, rate, discountType, discountValue, discountAmount, taxRateId, taxAmount, amount, sortOrder
  - Quote totals: subtotal, discountType, discountValue, discountAmount, taxAmount, total
  - Link to sales order after conversion (convertedToOrderId)
  - Organization-scoped with auto-generated quote numbers (QTE-XXXXXX)

### QQ-002: Quote CRUD API
- **Priority**: P0
- **Description**: Full CRUD with lifecycle management
- **Acceptance Criteria**:
  - POST /sales/quotes - create quote
  - GET /sales/quotes - list quotes with pagination, filters (status, customerId, dateRange, search)
  - GET /sales/quotes/:id - get quote detail with items
  - PUT /sales/quotes/:id - update quote (only DRAFT and SENT status)
  - DELETE /sales/quotes/:id - delete quote (only DRAFT status)
  - Quote numbers auto-generated: QTE-XXXXXX
  - Validate item existence, calculate totals server-side
  - For walk-in quotes: customerId is null, customerName stores the name

### QQ-003: Quote Lifecycle Actions
- **Priority**: P0
- **Description**: API endpoints for quote status transitions
- **Acceptance Criteria**:
  - PUT /sales/quotes/:id/send - mark as SENT (optionally email to customer)
  - PUT /sales/quotes/:id/accept - mark as ACCEPTED
  - PUT /sales/quotes/:id/reject - mark as REJECTED (with optional reason)
  - POST /sales/quotes/:id/convert-to-order - convert to sales order
  - Status transitions:
    - DRAFT -> SENT, ACCEPTED, REJECTED, EXPIRED
    - SENT -> ACCEPTED, REJECTED, EXPIRED
    - ACCEPTED -> CONVERTED
    - EXPIRED -> (no forward transitions, but can be duplicated)
    - CONVERTED -> (terminal state)
    - REJECTED -> (terminal state)
  - Invalid transitions return 400 error

### QQ-004: Quote to Sales Order Conversion
- **Priority**: P0
- **Description**: One-click conversion of an accepted quote into a sales order
- **Acceptance Criteria**:
  - POST /sales/quotes/:id/convert-to-order
  - Creates a new SalesOrder with all quote line items copied over
  - If quote has a customerId, use it for the SO. If walk-in, require customer selection at conversion time (or create a new contact)
  - Set quote status to CONVERTED and store convertedToOrderId
  - Copy: items, quantities, rates, discounts, tax, notes, terms
  - Sales order starts in CONFIRMED status (skip DRAFT since quote was already accepted)
  - Return the created sales order
  - Validate stock availability at conversion time (warn if insufficient, but allow override)

### QQ-005: Auto-Expiry
- **Priority**: P1
- **Description**: Automatically expire quotes past their validUntil date
- **Acceptance Criteria**:
  - Scheduled task (cron job) runs daily to expire quotes
  - Quotes with status DRAFT or SENT where validUntil < now() are set to EXPIRED
  - Log expired quotes for audit
  - API endpoint to manually check/trigger expiry: POST /sales/quotes/expire
  - Frontend shows days remaining until expiry on quote detail
  - Show "Expired" status prominently in red

### QQ-006: Quote PDF Generation
- **Priority**: P0
- **Description**: Generate professional PDF for quotes
- **Acceptance Criteria**:
  - GET /sales/quotes/:id/pdf - download quote as PDF
  - PDF template similar to existing invoice/SO PDF but branded as "QUOTATION"
  - Include: company header with logo, quote number, date, valid until date
  - Customer info section (name, phone, email for walk-ins; full contact details for registered customers)
  - Line items table: item, description, qty, unit price, discount, tax, amount
  - Totals section: subtotal, discount, tax, total
  - Terms and conditions
  - Footer with "This is a quotation, not a tax invoice" notice
  - Validity notice: "This quotation is valid until [date]"
  - Configurable template via existing PDF template system

### QQ-007: Quotes List Page
- **Priority**: P0
- **Description**: Page to view and manage all quotes
- **Acceptance Criteria**:
  - Route: /sales/quotes
  - Ant Design Table with columns: Quote #, Customer, Date, Valid Until, Status, Total, Actions
  - Filters: status, customer, date range, search (by quote number or customer name)
  - Status tags with colors:
    - DRAFT: blue
    - SENT: cyan
    - ACCEPTED: green
    - EXPIRED: default/gray
    - CONVERTED: purple
    - REJECTED: red
  - Row click navigates to quote detail
  - "New Quote" button
  - Bulk actions: delete drafts, expire selected
  - Show total count and value by status in summary cards above table

### QQ-008: Quote Create/Edit Page
- **Priority**: P0
- **Description**: Streamlined form for creating and editing quotes
- **Acceptance Criteria**:
  - Route: /sales/quotes/new and /sales/quotes/:id/edit
  - Customer section:
    - Toggle: "Registered Customer" vs "Walk-in Customer"
    - Registered: customer Select (searchable, from contacts)
    - Walk-in: Name input, Phone input, Email input (optional)
  - Valid Until: DatePicker (default: 7 days from now)
  - Items section:
    - Ant Design Table with inline editing
    - Item selector with search (by SKU, name, part number)
    - Columns: Item, Description, Qty, Rate, Discount, Tax, Amount
    - Add row button, remove row button
    - Auto-calculate line totals and grand total
    - Barcode scanner integration (scan to add item)
  - Totals section: subtotal, discount, tax breakdown, grand total
  - Notes and terms text areas
  - Action buttons: Save Draft, Send Quote, Save & Print

### QQ-009: Quick Quote Modal
- **Priority**: P0
- **Description**: Quick-access modal for creating quotes without leaving the current page
- **Acceptance Criteria**:
  - Accessible from:
    - Dashboard: "Quick Quote" button
    - Item detail page: "Add to Quote" action
    - Global keyboard shortcut (optional)
  - Simplified version of the full quote form in a modal/drawer
  - Customer: name input (quick walk-in mode by default), or select registered
  - Items: simple item search + add, quantity, rate
  - Auto-calculate total
  - Save as DRAFT or SENT
  - On save: option to print PDF immediately
  - Drawer (from right) for better screen space

### QQ-010: Quote Detail Page
- **Priority**: P0
- **Description**: View and take actions on an existing quote
- **Acceptance Criteria**:
  - Route: /sales/quotes/:id
  - Header: quote number, status tag, customer info, dates
  - Actions bar based on status:
    - DRAFT: Edit, Send, Delete
    - SENT: Mark Accepted, Mark Rejected, Edit, Resend
    - ACCEPTED: Convert to Order
    - EXPIRED: Duplicate (create new quote with same items)
    - CONVERTED: View Sales Order (link to SO)
  - Items table (read-only)
  - Totals section
  - Notes section
  - Activity timeline (status changes, sent dates)
  - PDF download and print buttons
  - "Days remaining" or "Expired X days ago" indicator

### QQ-011: Quote Email Sending
- **Priority**: P1
- **Description**: Send quote PDF to customer via email
- **Acceptance Criteria**:
  - POST /sales/quotes/:id/send with optional body { email, message }
  - If customer has email, pre-fill the email address
  - For walk-ins with email: use the walk-in email
  - Attaches quote PDF
  - Uses existing email sending infrastructure (OrganizationEmailSettings)
  - Default email subject: "Quotation [QTE-XXXXXX] from [Org Name]"
  - Default body template with quote summary
  - Send action also updates status to SENT

## API Endpoints

```
# Quote CRUD
POST   /api/sales/quotes                        - Create quote
GET    /api/sales/quotes                        - List quotes (paginated, filterable)
GET    /api/sales/quotes/:id                    - Get quote detail
PUT    /api/sales/quotes/:id                    - Update quote
DELETE /api/sales/quotes/:id                    - Delete quote (DRAFT only)

# Quote Lifecycle
PUT    /api/sales/quotes/:id/send               - Mark as sent / email to customer
PUT    /api/sales/quotes/:id/accept             - Mark as accepted
PUT    /api/sales/quotes/:id/reject             - Mark as rejected
POST   /api/sales/quotes/:id/convert-to-order   - Convert to sales order
POST   /api/sales/quotes/:id/duplicate          - Duplicate quote (for expired/rejected)

# Quote PDF
GET    /api/sales/quotes/:id/pdf                - Download quote PDF

# Auto-Expiry
POST   /api/sales/quotes/expire                 - Manually trigger expiry check
```

## Database Schema

```prisma
model Quote {
  id                String       @id @default(cuid())
  organizationId    String
  quoteNumber       String
  customerId        String?      // Null for walk-in customers
  customer          Contact?     @relation("QuoteCustomer", fields: [customerId], references: [id])
  customerName      String?      // Walk-in customer name
  customerPhone     String?      // Walk-in customer phone
  customerEmail     String?      // Walk-in customer email
  quoteDate         DateTime     @default(now())
  validUntil        DateTime     // Expiry date
  status            QuoteStatus  @default(DRAFT)
  subtotal          Decimal      @default(0) @db.Decimal(15, 2)
  discountType      DiscountType @default(PERCENTAGE)
  discountValue     Decimal      @default(0) @db.Decimal(15, 2)
  discountAmount    Decimal      @default(0) @db.Decimal(15, 2)
  taxAmount         Decimal      @default(0) @db.Decimal(15, 2)
  total             Decimal      @default(0) @db.Decimal(15, 2)
  notes             String?
  termsConditions   String?
  rejectionReason   String?
  convertedToOrderId String?     // SalesOrder.id after conversion
  convertedToOrder  SalesOrder?  @relation("QuoteConvertedToOrder", fields: [convertedToOrderId], references: [id])
  sentAt            DateTime?    // When quote was sent to customer
  acceptedAt        DateTime?
  rejectedAt        DateTime?
  expiredAt         DateTime?
  convertedAt       DateTime?
  createdById       String?
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  // Relations
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  items        QuoteItem[]

  @@unique([organizationId, quoteNumber])
  @@index([organizationId])
  @@index([customerId])
  @@index([status])
  @@index([quoteDate])
  @@index([validUntil])
}

model QuoteItem {
  id             String       @id @default(cuid())
  quoteId        String
  quote          Quote        @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  itemId         String
  item           Item         @relation(fields: [itemId], references: [id])
  description    String?
  quantity       Decimal      @db.Decimal(15, 4)
  unit           String
  rate           Decimal      @db.Decimal(15, 4)
  discountType   DiscountType @default(PERCENTAGE)
  discountValue  Decimal      @default(0) @db.Decimal(15, 2)
  discountAmount Decimal      @default(0) @db.Decimal(15, 2)
  taxRateId      String?
  taxAmount      Decimal      @default(0) @db.Decimal(15, 2)
  amount         Decimal      @db.Decimal(15, 2)
  sortOrder      Int          @default(0)

  @@index([quoteId])
  @@index([itemId])
}

enum QuoteStatus {
  DRAFT
  SENT
  ACCEPTED
  EXPIRED
  CONVERTED
  REJECTED
}
```

### Changes to Existing Models

```prisma
// Add to Item model relations:
model Item {
  // ... existing fields ...
  quoteItems QuoteItem[]
}

// Add to Contact model relations:
model Contact {
  // ... existing fields ...
  quotes Quote[] @relation("QuoteCustomer")
}

// Add to SalesOrder model:
model SalesOrder {
  // ... existing fields ...
  convertedFromQuote Quote? @relation("QuoteConvertedToOrder")
}

// Add to Organization model:
model Organization {
  // ... existing fields ...
  quotes Quote[]
}
```

## DTOs

### CreateQuoteDto
```typescript
import {
  IsString, IsOptional, IsArray, ValidateNested, IsDateString,
  IsNumber, IsEnum, Min, IsBoolean
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class QuoteItemDto {
  @IsString()
  itemId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsString()
  unit: string;

  @IsNumber()
  @Min(0)
  rate: number;

  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsString()
  taxRateId?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateQuoteDto {
  @ApiPropertyOptional({ description: 'Customer ID (null for walk-in)' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Walk-in customer name' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Walk-in customer phone' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'Walk-in customer email' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Quote expiry date' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiProperty({ description: 'Quote line items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];

  @ApiPropertyOptional({ description: 'Quote-level discount type' })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiPropertyOptional({ description: 'Quote-level discount value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termsConditions?: string;
}
// Custom validation: either customerId or customerName must be provided
```

### UpdateQuoteDto
```typescript
// Partial<CreateQuoteDto> - only DRAFT and SENT quotes can be updated
```

### ConvertQuoteDto
```typescript
export class ConvertQuoteDto {
  @IsOptional()
  @IsString()
  customerId?: string; // Required for walk-in quotes at conversion time

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  salesPersonId?: string;

  @IsOptional()
  @IsBoolean()
  skipStockCheck?: boolean; // Allow conversion even with insufficient stock
}
```

### RejectQuoteDto
```typescript
export class RejectQuoteDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
```

### SendQuoteDto
```typescript
export class SendQuoteDto {
  @IsOptional()
  @IsString()
  email?: string; // Override recipient email

  @IsOptional()
  @IsString()
  message?: string; // Custom message body
}
```

## NestJS Module Structure

```
apps/api/src/modules/sales/
├── quotes/
│   ├── quotes.controller.ts
│   ├── quotes.service.ts
│   └── dto/
│       ├── create-quote.dto.ts
│       ├── update-quote.dto.ts
│       ├── convert-quote.dto.ts
│       ├── reject-quote.dto.ts
│       └── send-quote.dto.ts
├── sales.controller.ts         - Existing sales controller
├── sales.module.ts             - Register QuotesController
└── sales.service.ts
```

## Controller Implementation

```typescript
// apps/api/src/modules/sales/quotes/quotes.controller.ts
@ApiTags('Quotes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales/quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create quote' })
  @ApiResponse({ status: 201, description: 'Quote created' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateQuoteDto
  ) {
    return this.quotesService.create(organizationId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List quotes' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('search') search?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.quotesService.findAll(organizationId, {
      status, customerId, search,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quote detail' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.quotesService.findOne(id, organizationId);
  }

  @Put(':id')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Update quote' })
  async update(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateQuoteDto
  ) {
    return this.quotesService.update(id, organizationId, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete quote (DRAFT only)' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.quotesService.remove(id, organizationId);
  }

  @Put(':id/send')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Send quote to customer' })
  async send(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto?: SendQuoteDto
  ) {
    return this.quotesService.send(id, organizationId, dto);
  }

  @Put(':id/accept')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Mark quote as accepted' })
  async accept(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.quotesService.accept(id, organizationId);
  }

  @Put(':id/reject')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Mark quote as rejected' })
  async reject(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto?: RejectQuoteDto
  ) {
    return this.quotesService.reject(id, organizationId, dto);
  }

  @Post(':id/convert-to-order')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Convert quote to sales order' })
  @ApiResponse({ status: 201, description: 'Sales order created from quote' })
  async convertToOrder(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto?: ConvertQuoteDto
  ) {
    return this.quotesService.convertToOrder(id, organizationId, userId, dto);
  }

  @Post(':id/duplicate')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Duplicate quote' })
  async duplicate(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.quotesService.duplicate(id, organizationId, userId);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download quote PDF' })
  async downloadPdf(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Res() res: Response
  ) {
    const pdf = await this.quotesService.generatePdf(id, organizationId);
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename=quote-${id}.pdf`);
    res.send(pdf);
  }

  @Post('expire')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Manually trigger quote expiry check' })
  async expireQuotes(
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.quotesService.expireQuotes(organizationId);
  }
}
```

## Service Implementation

```typescript
@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, userId: string, dto: CreateQuoteDto) {
    // Validate customer if provided
    if (dto.customerId) {
      const customer = await this.prisma.contact.findFirst({
        where: { id: dto.customerId, organizationId },
      });
      if (!customer) throw new NotFoundException('Customer not found');
    }

    // Validate: either customerId or customerName
    if (!dto.customerId && !dto.customerName) {
      throw new BadRequestException('Either customerId or customerName is required');
    }

    // Validate items
    const itemIds = dto.items.map(i => i.itemId);
    const items = await this.prisma.item.findMany({
      where: { id: { in: itemIds }, organizationId },
    });
    if (items.length !== itemIds.length) {
      throw new BadRequestException('One or more items not found');
    }

    // Generate quote number
    const lastQuote = await this.prisma.quote.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { quoteNumber: true },
    });
    const nextNum = lastQuote
      ? parseInt(lastQuote.quoteNumber.split('-')[1]) + 1
      : 1;
    const quoteNumber = `QTE-${String(nextNum).padStart(6, '0')}`;

    // Calculate default validUntil (7 days from now)
    const defaultValidDays = 7; // Could be from org settings
    const validUntil = dto.validUntil
      ? new Date(dto.validUntil)
      : new Date(Date.now() + defaultValidDays * 24 * 60 * 60 * 1000);

    // Calculate totals
    const quoteItems = dto.items.map((lineItem) => {
      const lineDiscount = lineItem.discountType === 'FIXED'
        ? (lineItem.discountValue || 0)
        : (lineItem.rate * lineItem.quantity * (lineItem.discountValue || 0)) / 100;
      const lineAmount = lineItem.rate * lineItem.quantity - lineDiscount;
      // Tax calculation would use taxRateId lookup
      return {
        itemId: lineItem.itemId,
        description: lineItem.description,
        quantity: lineItem.quantity,
        unit: lineItem.unit,
        rate: lineItem.rate,
        discountType: lineItem.discountType || 'PERCENTAGE',
        discountValue: lineItem.discountValue || 0,
        discountAmount: lineDiscount,
        taxRateId: lineItem.taxRateId,
        taxAmount: 0, // Calculate from tax rate
        amount: lineAmount,
        sortOrder: lineItem.sortOrder || 0,
      };
    });

    const subtotal = quoteItems.reduce((sum, item) => sum + Number(item.amount), 0);
    const quoteDiscount = dto.discountType === 'FIXED'
      ? (dto.discountValue || 0)
      : subtotal * ((dto.discountValue || 0) / 100);
    const taxAmount = quoteItems.reduce((sum, item) => sum + Number(item.taxAmount), 0);
    const total = subtotal - quoteDiscount + taxAmount;

    return this.prisma.quote.create({
      data: {
        quoteNumber,
        organizationId,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail,
        validUntil,
        subtotal,
        discountType: dto.discountType || 'PERCENTAGE',
        discountValue: dto.discountValue || 0,
        discountAmount: quoteDiscount,
        taxAmount,
        total,
        notes: dto.notes,
        termsConditions: dto.termsConditions,
        createdById: userId,
        items: {
          create: quoteItems,
        },
      },
      include: {
        customer: { select: { id: true, displayName: true, email: true, phone: true } },
        items: {
          include: { item: { select: { id: true, sku: true, name: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async convertToOrder(
    id: string, organizationId: string, userId: string, dto?: ConvertQuoteDto
  ) {
    const quote = await this.findOne(id, organizationId);

    if (quote.status !== 'ACCEPTED') {
      throw new BadRequestException('Only ACCEPTED quotes can be converted to orders');
    }

    // For walk-in quotes, require customerId at conversion
    let customerId = quote.customerId;
    if (!customerId) {
      if (!dto?.customerId) {
        throw new BadRequestException(
          'customerId is required to convert a walk-in quote to an order'
        );
      }
      customerId = dto.customerId;
    }

    return this.prisma.$transaction(async (tx) => {
      // Generate SO number
      const lastSO = await tx.salesOrder.findFirst({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        select: { orderNumber: true },
      });
      const nextSONum = lastSO
        ? parseInt(lastSO.orderNumber.split('-')[1]) + 1
        : 1;
      const orderNumber = `SO-${String(nextSONum).padStart(6, '0')}`;

      // Create sales order
      const salesOrder = await tx.salesOrder.create({
        data: {
          orderNumber,
          organizationId,
          customerId,
          orderDate: new Date(),
          status: 'CONFIRMED',
          warehouseId: dto?.warehouseId,
          salesPersonId: dto?.salesPersonId,
          subtotal: quote.subtotal,
          discountType: quote.discountType,
          discountValue: quote.discountValue,
          discountAmount: quote.discountAmount,
          taxAmount: quote.taxAmount,
          total: quote.total,
          notes: quote.notes,
          termsConditions: quote.termsConditions,
          createdById: userId,
          items: {
            create: quote.items.map((qi) => ({
              itemId: qi.itemId,
              description: qi.description,
              quantity: qi.quantity,
              unit: qi.unit,
              rate: qi.rate,
              discountType: qi.discountType,
              discountValue: qi.discountValue,
              discountAmount: qi.discountAmount,
              taxRateId: qi.taxRateId,
              taxAmount: qi.taxAmount,
              amount: qi.amount,
              sortOrder: qi.sortOrder,
            })),
          },
        },
        include: {
          customer: true,
          items: true,
        },
      });

      // Update quote status
      await tx.quote.update({
        where: { id },
        data: {
          status: 'CONVERTED',
          convertedToOrderId: salesOrder.id,
          convertedAt: new Date(),
        },
      });

      return salesOrder;
    });
  }

  async expireQuotes(organizationId: string) {
    const now = new Date();
    const result = await this.prisma.quote.updateMany({
      where: {
        organizationId,
        status: { in: ['DRAFT', 'SENT'] },
        validUntil: { lt: now },
      },
      data: {
        status: 'EXPIRED',
        expiredAt: now,
      },
    });

    return { expiredCount: result.count };
  }

  async duplicate(id: string, organizationId: string, userId: string) {
    const original = await this.findOne(id, organizationId);

    // Generate new quote number
    const lastQuote = await this.prisma.quote.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { quoteNumber: true },
    });
    const nextNum = lastQuote
      ? parseInt(lastQuote.quoteNumber.split('-')[1]) + 1
      : 1;
    const quoteNumber = `QTE-${String(nextNum).padStart(6, '0')}`;

    const defaultValidDays = 7;
    const validUntil = new Date(Date.now() + defaultValidDays * 24 * 60 * 60 * 1000);

    return this.prisma.quote.create({
      data: {
        quoteNumber,
        organizationId,
        customerId: original.customerId,
        customerName: original.customerName,
        customerPhone: original.customerPhone,
        customerEmail: original.customerEmail,
        validUntil,
        status: 'DRAFT',
        subtotal: original.subtotal,
        discountType: original.discountType,
        discountValue: original.discountValue,
        discountAmount: original.discountAmount,
        taxAmount: original.taxAmount,
        total: original.total,
        notes: original.notes,
        termsConditions: original.termsConditions,
        createdById: userId,
        items: {
          create: original.items.map((qi) => ({
            itemId: qi.itemId,
            description: qi.description,
            quantity: qi.quantity,
            unit: qi.unit,
            rate: qi.rate,
            discountType: qi.discountType,
            discountValue: qi.discountValue,
            discountAmount: qi.discountAmount,
            taxRateId: qi.taxRateId,
            taxAmount: qi.taxAmount,
            amount: qi.amount,
            sortOrder: qi.sortOrder,
          })),
        },
      },
      include: {
        customer: true,
        items: { include: { item: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
  }
}
```

## Frontend Components

### File Structure
```
apps/web/src/
├── app/(dashboard)/sales/quotes/
│   ├── page.tsx                         - Quotes list page
│   ├── new/
│   │   └── page.tsx                     - Create quote page
│   └── [id]/
│       ├── page.tsx                     - Quote detail page
│       └── edit/
│           └── page.tsx                 - Edit quote page
├── components/quotes/
│   ├── QuotesList.tsx                   - Table component
│   ├── QuoteForm.tsx                    - Create/edit form
│   ├── QuoteDetail.tsx                  - Detail view
│   ├── QuoteItemsTable.tsx             - Line items editor
│   ├── QuickQuoteDrawer.tsx            - Quick quote drawer
│   ├── ConvertToOrderModal.tsx         - Conversion confirmation
│   ├── QuoteStatusTag.tsx              - Colored status tag
│   └── QuoteSummaryCards.tsx           - Summary stats above table
├── hooks/
│   └── use-quotes.ts                    - React Query hooks
└── lib/
    └── quotes.ts                        - API client functions
```

### QuickQuoteDrawer Component
```tsx
// Ant Design Drawer (from right side, 600px width)
// Simplified form:
// - Customer toggle: Walk-in (name+phone) or Registered (Select)
// - Items section: search input + item list with qty/rate
// - Running total at bottom
// - Action bar: Save Draft, Save & Send, Save & Print
// Accessible from:
// - Dashboard "Quick Quote" button
// - Item detail "Add to Quote" button
// - Keyboard shortcut (optional)
```

### QuoteForm Component
```tsx
// Full quote creation/edit form
// Customer section with toggle:
//   - Walk-in: Name, Phone, Email inputs
//   - Registered: Customer Select with search
// Valid Until: DatePicker with preset buttons (7 days, 14 days, 30 days)
// Items: QuoteItemsTable (inline editable table)
// Discount: type select (%, fixed) + value input
// Notes and Terms: TextArea fields
// Totals: calculated display (subtotal, discount, tax, total)
// Action bar: Save Draft, Send, Save & Print
```

### QuoteDetail Component
```tsx
// Header section: quote number, status tag, customer info, dates
// Validity indicator:
//   - Green: "Valid for X more days"
//   - Red: "Expired X days ago"
//   - Gray: "Converted to SO-XXXXXX"
// Actions (context-dependent):
//   - DRAFT: Edit, Send, Delete
//   - SENT: Accept, Reject, Edit
//   - ACCEPTED: Convert to Order
//   - EXPIRED/REJECTED: Duplicate
//   - CONVERTED: View Sales Order link
// Items table (read-only, same layout as SO)
// Totals section
// PDF download button
```

### React Query Hooks
```typescript
// apps/web/src/hooks/use-quotes.ts
export function useQuotes(params: QuoteQueryParams) {
  return useQuery({
    queryKey: ['quotes', params],
    queryFn: () => apiClient.get('/sales/quotes', { params }).then(r => r.data),
  });
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: ['quote', id],
    queryFn: () => apiClient.get(`/sales/quotes/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateQuoteDto) => apiClient.post('/sales/quotes', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  });
}

export function useConvertQuoteToOrder(quoteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data?: ConvertQuoteDto) =>
      apiClient.post(`/sales/quotes/${quoteId}/convert-to-order`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    },
  });
}

export function useSendQuote(quoteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data?: SendQuoteDto) =>
      apiClient.put(`/sales/quotes/${quoteId}/send`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

export function useDownloadQuotePdf(quoteId: string) {
  return useMutation({
    mutationFn: () => apiClient.get(`/sales/quotes/${quoteId}/pdf`, {
      responseType: 'blob',
    }).then(r => {
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `quote-${quoteId}.pdf`;
      link.click();
    }),
  });
}
```

## PDF Template

```
apps/api/src/templates/pdf/
├── quote.hbs                    - Quote PDF template
└── partials/
    └── (reuse existing partials: document-header, document-footer, line-items-table, etc.)
```

### Quote PDF Layout
```
+-----------------------------------------------+
| [Logo]  Company Name                           |
|         Address line 1                         |
|         SST No: xxx                            |
+-----------------------------------------------+
|                  QUOTATION                     |
|                                                |
| Quote #: QTE-000123      Date: 08 Feb 2026    |
| Valid Until: 15 Feb 2026                       |
+-----------------------------------------------+
| Customer:                                      |
| [Name]                                         |
| [Phone] [Email]                                |
| [Address if registered customer]               |
+-----------------------------------------------+
| # | Item     | Desc | Qty | Rate | Disc | Amt |
|---|----------|------|-----|------|------|-----|
| 1 | SKU-001  | ...  | 2   | 50   | 0    | 100 |
| 2 | SKU-002  | ...  | 1   | 200  | 10%  | 180 |
+-----------------------------------------------+
|                          Subtotal:   RM 280.00 |
|                          Discount:   -RM 0.00  |
|                          SST (10%):  RM 28.00  |
|                          TOTAL:      RM 308.00 |
+-----------------------------------------------+
| Notes: ...                                     |
| Terms: ...                                     |
+-----------------------------------------------+
| This is a quotation only. Not a tax invoice.   |
| This quotation is valid until 15 Feb 2026.     |
+-----------------------------------------------+
```

## Business Logic and Validation Rules

1. **Customer requirement**: Either `customerId` (registered) or `customerName` (walk-in) must be provided. Both can be set simultaneously.
2. **Status transitions**: Strictly enforced. DRAFT -> SENT/ACCEPTED/REJECTED. SENT -> ACCEPTED/REJECTED. ACCEPTED -> CONVERTED. No backward transitions.
3. **Edit restrictions**: Only DRAFT and SENT quotes can be edited. ACCEPTED, EXPIRED, CONVERTED, and REJECTED are read-only.
4. **Delete restrictions**: Only DRAFT quotes can be deleted.
5. **Conversion requires customer**: Walk-in quotes must have a customerId specified at conversion time (either existing contact or create new one) because SalesOrder requires a customer.
6. **Auto-expiry**: Quotes past validUntil are automatically set to EXPIRED. This runs as a scheduled cron job (e.g., daily at midnight) and can be triggered manually.
7. **Quote numbers**: Auto-generated as QTE-XXXXXX, sequential per organization.
8. **Default validity**: 7 days from creation. Configurable via organization settings (`settings` JSON field).
9. **Totals calculated server-side**: Line item amounts, discounts, tax, and totals are always recalculated server-side to prevent manipulation.
10. **Duplicate function**: Creates a new DRAFT quote with the same items, customer, and terms but new number and reset dates.
11. **PDF notice**: Quote PDFs must include "This is a quotation only. Not a tax invoice." to comply with Malaysian business practices.

## Navigation Integration

Add to the sidebar navigation under "Sales":

```
Sales
├── Orders
├── Invoices
├── Quotes               <- NEW
├── Payments
├── Returns
└── Credit Notes
```

## Cron Job Configuration

```typescript
// apps/api/src/modules/sales/quotes/quotes.cron.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QuotesService } from './quotes.service';

@Injectable()
export class QuotesCron {
  constructor(private readonly quotesService: QuotesService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiry() {
    // Expire quotes for all organizations
    // Log results
  }
}
```
