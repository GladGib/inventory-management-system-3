# Barcode Support (Web)

## Overview
Generate, print, and scan barcodes for inventory items. Auto parts wholesalers use barcodes for quick item lookup at the counter, warehouse receiving, and stocktaking. This spec covers barcode generation (Code128, EAN-13, QR), label printing with configurable templates, and barcode scanner input handling for USB scanners connected to the browser.

## Scope
- **In Scope**: Barcode generation from SKU/part numbers, label templates (thermal 2x1", A4 sheet), print functionality, barcode scanner input listener for USB scanners, API endpoints for barcode image generation, batch label generation, label template configuration in settings
- **Out of Scope**: Mobile camera-based barcode scanning (would require a separate mobile app or PWA camera API), Bluetooth scanner support, barcode hardware configuration/drivers

## Requirements

### BC-001: Barcode Generation Library
- **Priority**: P0
- **Description**: Generate barcode images from item data using JsBarcode
- **Acceptance Criteria**:
  - Support Code128 format (default for most auto parts)
  - Support EAN-13 format (for retail-packaged items)
  - Support QR code format (can encode full item details URL)
  - Generate as SVG (preferred for quality) or PNG
  - Configurable dimensions: width, height, margin
  - Include human-readable text below barcode (the encoded value)
  - Backend generation via API endpoint for server-side use (labels, PDFs)
  - Frontend generation via JsBarcode for real-time preview

### BC-002: Barcode Generation API
- **Priority**: P0
- **Description**: API endpoints for generating barcode images
- **Acceptance Criteria**:
  - GET /items/:id/barcode?format=code128&width=200&height=80&output=svg
  - Query params: format (code128|ean13|qr), width, height, output (svg|png), includeText (boolean)
  - For QR: encode a URL to the item detail page, or encode item metadata JSON
  - Response: SVG string or PNG binary
  - Default format: code128
  - Default dimensions: 200x80 for linear barcodes, 200x200 for QR
  - Barcode value: uses item SKU by default, or partNumber if specified
  - POST /items/barcode/batch - generate multiple barcode labels for printing
  - Batch endpoint accepts array of { itemId, quantity, format } and returns a single printable HTML/PDF document

### BC-003: Label Templates
- **Priority**: P0
- **Description**: Configurable label templates for different print formats
- **Acceptance Criteria**:
  - Thermal label template: 2" x 1" (50mm x 25mm) - standard thermal printer label
  - A4 sheet template: grid layout of labels on A4 paper (e.g., 65 labels per sheet, Avery L7651 compatible)
  - Custom template support via settings
  - Each template defines:
    - Page/label dimensions
    - Fields to include: barcode, SKU, name, part number, price, brand
    - Field positions and font sizes
    - Organization logo option
    - Number of columns/rows (for sheet layouts)
    - Margins and gutters
  - Default templates pre-configured for common use cases

### BC-004: BarcodeLabel Component
- **Priority**: P0
- **Description**: React component for rendering and previewing barcode labels
- **Acceptance Criteria**:
  - Renders a single barcode label based on template
  - Props: item data, template config, barcode format
  - Real-time preview using JsBarcode (SVG rendering in browser)
  - Displays: barcode image, SKU text, item name (truncated), part number, optional price
  - Responsive sizing for preview vs. print
  - Print-optimized CSS (@media print)

### BC-005: Print Labels Button on Items List
- **Priority**: P0
- **Description**: Bulk select items and print barcode labels
- **Acceptance Criteria**:
  - Checkbox selection on items list table
  - "Print Labels" button appears when items are selected
  - Opens PrintLabelsModal:
    - Shows selected items with quantity input per item (default: 1)
    - Template selector (thermal, A4 sheet, custom)
    - Barcode format selector (Code128, EAN-13, QR)
    - Fields to include checkboxes (SKU, name, part number, price, brand)
    - Preview pane showing a sample label
    - "Print" button opens browser print dialog with print-optimized layout
    - "Download PDF" button generates printable PDF via API
  - Print layout uses CSS @media print for clean output
  - No headers/footers/margins from browser in print output

### BC-006: Barcode on Item Detail Page
- **Priority**: P0
- **Description**: Display barcode on the item detail page
- **Acceptance Criteria**:
  - Show barcode in the item detail header or in a dedicated section
  - Default: Code128 barcode of the SKU
  - "Print Label" quick action button
  - Copy barcode value to clipboard
  - Toggleable barcode format (Code128, EAN-13, QR)
  - Download barcode image (SVG/PNG)

### BC-007: BarcodeScanner Component
- **Priority**: P0
- **Description**: Component that detects and handles USB barcode scanner input
- **Acceptance Criteria**:
  - USB barcode scanners emulate keyboard input (rapid keystrokes ending with Enter)
  - Component detects rapid character input (< 50ms between keystrokes) as scanner input
  - Distinguishes scanner input from manual keyboard typing by timing threshold
  - When scan detected: trigger callback with scanned value
  - Configurable: minimum scan length (default: 3 chars), maximum inter-key delay (default: 50ms)
  - Global listener option: can be enabled at layout level for app-wide scanning
  - Focus-based listener option: only active when a specific input is focused
  - Audio feedback option: beep sound on successful scan
  - Integration points:
    - Items list: scan to search for item by SKU
    - Sales order form: scan to add item to order
    - Purchase receive: scan to match received items
    - Inventory count: scan to record items during stocktake

### BC-008: Label Template Configuration (Settings)
- **Priority**: P1
- **Description**: Settings page to manage label templates
- **Acceptance Criteria**:
  - Route: /settings/barcode-labels
  - List of templates with Add, Edit, Delete, Set Default actions
  - Template editor:
    - Name and description
    - Page size: thermal (custom dimensions), A4, Letter, custom
    - Label size: width x height in mm
    - Grid layout: columns, rows, margin, gutter (for sheet layouts)
    - Fields selector: checkboxes for which fields to include
    - Font size configuration
    - Logo toggle
    - Live preview of label with sample data
  - Pre-built templates that cannot be deleted (but can be duplicated and customized)
  - Organization-scoped

### BC-009: Barcode in Sales and Purchase Flows
- **Priority**: P1
- **Description**: Use barcode scanning in transactional flows
- **Acceptance Criteria**:
  - Sales order creation: "Scan Item" button or always-on scanner listener
  - When item scanned: look up by SKU, add to order with quantity 1
  - If scanned item not found: show "Item not found" notification
  - If item already in order: increment quantity by 1
  - Purchase receive: scan to match against PO line items
  - Visual feedback on successful scan (green flash, sound)
  - Works with the BarcodeScanner component from BC-007

## API Endpoints

```
# Barcode Generation
GET    /api/items/:id/barcode                     - Generate barcode image for item
POST   /api/items/barcode/batch                   - Generate batch of labels (returns HTML/PDF)

# Label Templates (Settings)
GET    /api/settings/label-templates               - List label templates
POST   /api/settings/label-templates               - Create template
PUT    /api/settings/label-templates/:id           - Update template
DELETE /api/settings/label-templates/:id           - Delete template
GET    /api/settings/label-templates/:id/preview   - Preview template with sample data
```

## Database Schema

```prisma
model LabelTemplate {
  id              String   @id @default(cuid())
  name            String
  description     String?
  isDefault       Boolean  @default(false)
  isBuiltIn       Boolean  @default(false) // Pre-built templates, non-deletable
  pageSize        String   @default("THERMAL") // THERMAL, A4, LETTER, CUSTOM
  labelWidth      Decimal  @db.Decimal(8, 2)  // in mm
  labelHeight     Decimal  @db.Decimal(8, 2)  // in mm
  columns         Int      @default(1)
  rows            Int      @default(1)
  marginTop       Decimal  @default(0) @db.Decimal(8, 2)
  marginBottom    Decimal  @default(0) @db.Decimal(8, 2)
  marginLeft      Decimal  @default(0) @db.Decimal(8, 2)
  marginRight     Decimal  @default(0) @db.Decimal(8, 2)
  gutterX         Decimal  @default(0) @db.Decimal(8, 2)  // Horizontal gap between labels
  gutterY         Decimal  @default(0) @db.Decimal(8, 2)  // Vertical gap between labels
  barcodeFormat   String   @default("CODE128")  // CODE128, EAN13, QR
  fields          Json     @default("[\"sku\", \"name\", \"barcode\"]") // Array of field names to include
  fontSize        Int      @default(10)  // Base font size in pt
  showLogo        Boolean  @default(false)
  showPrice       Boolean  @default(false)
  organizationId  String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([organizationId, name])
  @@index([organizationId])
}
```

### Changes to Organization Model

```prisma
model Organization {
  // ... existing fields ...
  labelTemplates LabelTemplate[]
}
```

## NestJS Module Structure

```
apps/api/src/modules/items/
├── barcode/
│   ├── barcode.controller.ts          - Barcode generation endpoints
│   ├── barcode.service.ts             - Barcode generation logic
│   └── dto/
│       ├── barcode-query.dto.ts       - GET params for single barcode
│       └── batch-barcode.dto.ts       - POST body for batch generation

apps/api/src/modules/settings/
├── label-templates/
│   ├── label-templates.controller.ts
│   ├── label-templates.service.ts
│   └── dto/
│       ├── create-label-template.dto.ts
│       └── update-label-template.dto.ts
```

## DTOs

### BarcodeQueryDto
```typescript
import { IsOptional, IsString, IsInt, IsBoolean, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export enum BarcodeFormat {
  CODE128 = 'code128',
  EAN13 = 'ean13',
  QR = 'qr',
}

export enum BarcodeOutput {
  SVG = 'svg',
  PNG = 'png',
}

export class BarcodeQueryDto {
  @IsOptional()
  @IsEnum(BarcodeFormat)
  format?: BarcodeFormat = BarcodeFormat.CODE128;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  width?: number = 200;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  height?: number = 80;

  @IsOptional()
  @IsEnum(BarcodeOutput)
  output?: BarcodeOutput = BarcodeOutput.SVG;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeText?: boolean = true;

  @IsOptional()
  @IsString()
  value?: string; // Override value (defaults to SKU)
}
```

### BatchBarcodeDto
```typescript
import { IsArray, ValidateNested, IsString, IsInt, Min, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

class BatchBarcodeItem {
  @IsString()
  itemId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsEnum(BarcodeFormat)
  format?: BarcodeFormat;
}

export class BatchBarcodeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchBarcodeItem)
  items: BatchBarcodeItem[];

  @IsOptional()
  @IsString()
  templateId?: string; // Label template to use

  @IsOptional()
  @IsString()
  outputFormat?: 'html' | 'pdf'; // Default: html
}
```

### CreateLabelTemplateDto
```typescript
import { IsString, IsOptional, IsBoolean, IsInt, IsNumber, IsArray } from 'class-validator';

export class CreateLabelTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsString()
  pageSize: string;

  @IsNumber()
  labelWidth: number;

  @IsNumber()
  labelHeight: number;

  @IsOptional()
  @IsInt()
  columns?: number;

  @IsOptional()
  @IsInt()
  rows?: number;

  @IsOptional()
  @IsNumber()
  marginTop?: number;

  @IsOptional()
  @IsNumber()
  marginBottom?: number;

  @IsOptional()
  @IsNumber()
  marginLeft?: number;

  @IsOptional()
  @IsNumber()
  marginRight?: number;

  @IsOptional()
  @IsNumber()
  gutterX?: number;

  @IsOptional()
  @IsNumber()
  gutterY?: number;

  @IsOptional()
  @IsString()
  barcodeFormat?: string;

  @IsOptional()
  @IsArray()
  fields?: string[];

  @IsOptional()
  @IsInt()
  fontSize?: number;

  @IsOptional()
  @IsBoolean()
  showLogo?: boolean;

  @IsOptional()
  @IsBoolean()
  showPrice?: boolean;
}
```

## Controller Implementation

```typescript
// apps/api/src/modules/items/barcode/barcode.controller.ts
@ApiTags('Barcodes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('items')
export class BarcodeController {
  constructor(private readonly barcodeService: BarcodeService) {}

  @Get(':id/barcode')
  @ApiOperation({ summary: 'Generate barcode image for item' })
  @ApiResponse({ status: 200, description: 'Barcode SVG or PNG' })
  async generateBarcode(
    @Param('id') itemId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: BarcodeQueryDto,
    @Res() res: Response
  ) {
    const result = await this.barcodeService.generate(itemId, organizationId, query);

    if (query.output === 'png') {
      res.set('Content-Type', 'image/png');
      res.send(result);
    } else {
      res.set('Content-Type', 'image/svg+xml');
      res.send(result);
    }
  }

  @Post('barcode/batch')
  @ApiOperation({ summary: 'Generate batch barcode labels for printing' })
  @ApiResponse({ status: 200, description: 'Printable HTML or PDF with labels' })
  async generateBatch(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: BatchBarcodeDto,
    @Res() res: Response
  ) {
    const result = await this.barcodeService.generateBatch(organizationId, dto);

    if (dto.outputFormat === 'pdf') {
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', 'attachment; filename=barcode-labels.pdf');
      res.send(result);
    } else {
      res.set('Content-Type', 'text/html');
      res.send(result);
    }
  }
}
```

## Service Implementation

```typescript
// apps/api/src/modules/items/barcode/barcode.service.ts
import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';
import QRCode from 'qrcode';

@Injectable()
export class BarcodeService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(itemId: string, organizationId: string, query: BarcodeQueryDto) {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, organizationId },
      select: { sku: true, partNumber: true, name: true },
    });
    if (!item) throw new NotFoundException('Item not found');

    const value = query.value || item.sku;
    const { format = 'code128', width = 200, height = 80, output = 'svg', includeText = true } = query;

    if (format === 'qr') {
      return this.generateQR(value, width, output);
    }

    return this.generateLinearBarcode(value, format, width, height, output, includeText);
  }

  private async generateLinearBarcode(
    value: string, format: string, width: number, height: number,
    output: string, includeText: boolean
  ): Promise<string | Buffer> {
    if (output === 'svg') {
      // Use JsBarcode SVG generation
      const xmlSerializer = require('xmlserializer');
      const { DOMImplementation, XMLSerializer } = require('xmldom');
      const document = new DOMImplementation().createDocument('http://www.w3.org/1999/xhtml', 'html', null);
      const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

      JsBarcode(svgNode, value, {
        format: format.toUpperCase(),
        width: 2,
        height,
        displayValue: includeText,
        fontSize: 14,
        margin: 10,
      });

      return new XMLSerializer().serializeToString(svgNode);
    } else {
      // Use canvas for PNG
      const canvas = createCanvas(width, height);
      JsBarcode(canvas, value, {
        format: format.toUpperCase(),
        width: 2,
        height: height - 20,
        displayValue: includeText,
      });
      return canvas.toBuffer('image/png');
    }
  }

  private async generateQR(value: string, size: number, output: string): Promise<string | Buffer> {
    if (output === 'svg') {
      return QRCode.toString(value, { type: 'svg', width: size });
    } else {
      return QRCode.toBuffer(value, { type: 'png', width: size });
    }
  }

  async generateBatch(organizationId: string, dto: BatchBarcodeDto) {
    // Load template
    const template = dto.templateId
      ? await this.prisma.labelTemplate.findFirst({
          where: { id: dto.templateId, organizationId },
        })
      : await this.prisma.labelTemplate.findFirst({
          where: { organizationId, isDefault: true },
        });

    // Load items
    const itemIds = dto.items.map(i => i.itemId);
    const items = await this.prisma.item.findMany({
      where: { id: { in: itemIds }, organizationId },
      select: { id: true, sku: true, name: true, partNumber: true, sellingPrice: true, brand: true },
    });

    // Build labels array (item repeated by quantity)
    const labels = [];
    for (const batchItem of dto.items) {
      const item = items.find(i => i.id === batchItem.itemId);
      if (!item) continue;
      for (let q = 0; q < batchItem.quantity; q++) {
        labels.push({ item, format: batchItem.format || template?.barcodeFormat || 'CODE128' });
      }
    }

    // Render to HTML (uses template for layout) or PDF (uses puppeteer)
    if (dto.outputFormat === 'pdf') {
      return this.renderLabelsPdf(labels, template);
    }
    return this.renderLabelsHtml(labels, template);
  }
}
```

## Frontend Components

### File Structure
```
apps/web/src/
├── app/(dashboard)/settings/barcode-labels/
│   └── page.tsx                           - Label template settings page
├── components/barcode/
│   ├── BarcodeLabel.tsx                   - Single label render component
│   ├── BarcodePreview.tsx                 - Barcode preview with format toggle
│   ├── BarcodeScanner.tsx                 - USB scanner input listener
│   ├── PrintLabelsModal.tsx               - Bulk label print modal
│   ├── LabelTemplateEditor.tsx            - Template configuration form
│   └── ScannerIndicator.tsx               - Visual indicator when scanner is active
├── hooks/
│   ├── use-barcode.ts                     - Barcode generation hooks
│   ├── use-barcode-scanner.ts             - Scanner listener hook
│   └── use-label-templates.ts             - Template CRUD hooks
└── lib/
    ├── barcode.ts                         - API client for barcode endpoints
    └── label-templates.ts                 - API client for template endpoints
```

### BarcodeScanner Component / Hook
```tsx
// apps/web/src/hooks/use-barcode-scanner.ts
import { useEffect, useCallback, useRef } from 'react';

interface UseBarcodeScanner Options {
  onScan: (value: string) => void;
  enabled?: boolean;
  minLength?: number;        // Min chars to consider a scan (default: 3)
  maxDelay?: number;         // Max ms between keystrokes (default: 50)
  onError?: (error: string) => void;
}

export function useBarcodeScanner({
  onScan,
  enabled = true,
  minLength = 3,
  maxDelay = 50,
  onError,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout>();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const now = Date.now();
    const timeSinceLastKey = now - lastKeyTimeRef.current;

    // If too long between keys, reset buffer (manual typing)
    if (timeSinceLastKey > maxDelay && bufferRef.current.length > 0) {
      bufferRef.current = '';
    }

    lastKeyTimeRef.current = now;

    if (event.key === 'Enter') {
      // End of scan
      if (bufferRef.current.length >= minLength) {
        onScan(bufferRef.current);
        // Play beep sound (optional)
      }
      bufferRef.current = '';
      return;
    }

    // Only accumulate printable characters
    if (event.key.length === 1) {
      bufferRef.current += event.key;
    }

    // Clear buffer after a timeout (no Enter received)
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      bufferRef.current = '';
    }, 200);
  }, [onScan, minLength, maxDelay]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timerRef.current);
    };
  }, [enabled, handleKeyDown]);
}
```

### BarcodeLabel Component
```tsx
// apps/web/src/components/barcode/BarcodeLabel.tsx
'use client';
import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface Props {
  value: string;
  format?: 'CODE128' | 'EAN13';
  width?: number;
  height?: number;
  showText?: boolean;
  itemName?: string;
  partNumber?: string;
  price?: number;
  className?: string;
}

export function BarcodeLabel({
  value, format = 'CODE128', width = 2, height = 50,
  showText = true, itemName, partNumber, price, className
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      JsBarcode(svgRef.current, value, {
        format,
        width,
        height,
        displayValue: showText,
        fontSize: 12,
        margin: 5,
      });
    }
  }, [value, format, width, height, showText]);

  return (
    <div className={`barcode-label ${className || ''}`} style={{ textAlign: 'center' }}>
      <svg ref={svgRef} />
      {itemName && (
        <div style={{ fontSize: 10, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {itemName}
        </div>
      )}
      {partNumber && (
        <div style={{ fontSize: 9, color: '#666' }}>P/N: {partNumber}</div>
      )}
      {price !== undefined && (
        <div style={{ fontSize: 11, fontWeight: 'bold' }}>RM {price.toFixed(2)}</div>
      )}
    </div>
  );
}
```

### PrintLabelsModal Component
```tsx
// apps/web/src/components/barcode/PrintLabelsModal.tsx
// Modal triggered from items list page when items are selected
// Layout:
// - Left side: selected items list with quantity spinners
// - Right side: settings (template, format, fields to include) + live preview
// - Bottom: Print button (window.print()) and Download PDF button
// Uses @media print CSS to hide everything except the label grid
// Label grid renders BarcodeLabel components in the template's grid layout
```

### BarcodePreview Component (Item Detail)
```tsx
// Shows on item detail page header or in a card
// Toggle between Code128, EAN13, QR
// Copy value button, Download SVG/PNG button, Print single label button
```

### Settings Page (/settings/barcode-labels)
```tsx
// List of label templates with:
// - Name, page size, label dimensions, default indicator
// - Add, Edit, Duplicate, Delete, Set Default actions
// - Edit opens LabelTemplateEditor in a drawer/modal
// LabelTemplateEditor:
// - Form with all template fields
// - Live preview panel showing a label with sample data
// - Ant Design Form with proper validation
```

## Business Logic and Validation Rules

1. **Barcode format compatibility**: EAN-13 requires exactly 12 or 13 digits. Code128 supports alphanumeric. Validate barcode value against format requirements before generation.
2. **SKU as default barcode value**: The item's SKU is the default barcode value. The API allows overriding with any value, but the frontend defaults to SKU.
3. **Template uniqueness**: Template names must be unique per organization.
4. **Built-in templates**: Pre-built templates (isBuiltIn=true) cannot be deleted but can be duplicated and customized.
5. **Default template**: Only one template can be the default. Setting a new default unsets the previous one.
6. **Scanner buffer handling**: The scanner component must handle edge cases: partial scans, noise characters, rapid manual typing. The timing threshold is the primary discriminator.
7. **Print CSS**: Label print output must use `@media print` styles that hide the application UI and only render the label grid. Labels must respect exact dimensions for correct printer output.
8. **Batch limits**: Batch barcode generation is limited to 500 labels per request to prevent memory issues.
9. **Dependencies**: Backend uses `jsbarcode`, `canvas` (node-canvas), and `qrcode` npm packages for server-side generation. Frontend uses `jsbarcode` directly on SVG elements.

## Package Dependencies

### Backend (apps/api)
```json
{
  "jsbarcode": "^3.11.6",
  "canvas": "^2.11.2",
  "qrcode": "^1.5.3"
}
```

### Frontend (apps/web)
```json
{
  "jsbarcode": "^3.11.6"
}
```

## Seed Data (Default Templates)

```typescript
const defaultTemplates = [
  {
    name: 'Thermal 2x1',
    description: 'Standard thermal printer label (50mm x 25mm)',
    isBuiltIn: true,
    isDefault: true,
    pageSize: 'THERMAL',
    labelWidth: 50,
    labelHeight: 25,
    columns: 1,
    rows: 1,
    barcodeFormat: 'CODE128',
    fields: ['barcode', 'sku', 'name'],
    fontSize: 8,
  },
  {
    name: 'A4 Sheet (65 labels)',
    description: 'A4 sheet with 65 labels (5x13), compatible with Avery L7651',
    isBuiltIn: true,
    pageSize: 'A4',
    labelWidth: 38.1,
    labelHeight: 21.2,
    columns: 5,
    rows: 13,
    marginTop: 10.7,
    marginLeft: 4.6,
    gutterX: 2.5,
    gutterY: 0,
    barcodeFormat: 'CODE128',
    fields: ['barcode', 'sku'],
    fontSize: 7,
  },
  {
    name: 'A4 Sheet (24 labels)',
    description: 'A4 sheet with 24 labels (3x8), larger labels with more detail',
    isBuiltIn: true,
    pageSize: 'A4',
    labelWidth: 64,
    labelHeight: 33.9,
    columns: 3,
    rows: 8,
    marginTop: 12.9,
    marginLeft: 7.2,
    gutterX: 2.5,
    gutterY: 0,
    barcodeFormat: 'CODE128',
    fields: ['barcode', 'sku', 'name', 'partNumber'],
    fontSize: 9,
  },
];
```

## Navigation Integration

Add "Print Labels" to the Items list page action bar.
Add "Barcode Labels" to Settings navigation:

```
Settings
├── Organization
├── Tax Rates
├── Payment Terms
├── Barcode Labels     <- NEW
├── E-Invoice
└── Email
```
