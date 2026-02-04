# Report Exports (Excel & PDF)

## Overview
Export functionality for all reports to Excel (XLSX) and PDF formats.

## Requirements

### EXP-001: Excel Export Service
- **Priority**: P1
- **Description**: Generate Excel files from report data
- **Acceptance Criteria**:
  - Support multiple sheets per workbook
  - Formatted headers with styles
  - Column auto-width
  - Number/currency formatting
  - Date formatting
  - Summary row at bottom
  - Include report filters/parameters

### EXP-002: PDF Export Service
- **Priority**: P1
- **Description**: Generate PDF files from report data
- **Acceptance Criteria**:
  - Company letterhead
  - Report title and date
  - Filter parameters shown
  - Formatted table
  - Summary section
  - Page numbers
  - Charts (where applicable)

### EXP-003: Export UI Components
- **Priority**: P1
- **Description**: Export buttons in report pages
- **Acceptance Criteria**:
  - Dropdown with Excel/PDF options
  - Loading state during generation
  - Auto-download on completion
  - Filename includes report name and date

### EXP-004: Report Types Support
- **Priority**: P1
- **Description**: Export support for all reports
- **Acceptance Criteria**:
  - Sales by Customer
  - Sales by Item
  - Receivables Aging
  - Inventory Summary
  - Inventory Valuation
  - Stock Aging
  - Purchase by Vendor
  - Payables Aging

## Backend Implementation

### Excel Export Service
```typescript
// apps/api/src/modules/reports/services/excel-export.service.ts

import * as ExcelJS from 'exceljs';

@Injectable()
export class ExcelExportService {
  async generateWorkbook(report: ReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IMS';
    workbook.created = new Date();

    // Add data sheet
    const sheet = workbook.addWorksheet(report.title);

    // Add header row with styling
    const headerRow = sheet.addRow(report.columns.map(c => c.title));
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    report.rows.forEach(row => {
      sheet.addRow(report.columns.map(c => row[c.dataIndex]));
    });

    // Add summary row if present
    if (report.summary) {
      const summaryRow = sheet.addRow(
        report.columns.map(c => report.summary[c.dataIndex] || '')
      );
      summaryRow.font = { bold: true };
    }

    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = Math.max(column.width || 10, 12);
    });

    // Return as buffer
    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }
}
```

### PDF Export Service
```typescript
// apps/api/src/modules/reports/services/pdf-export.service.ts

@Injectable()
export class PdfExportService {
  constructor(private readonly pdfService: PdfService) {}

  async generateReportPdf(report: ReportData, org: Organization): Promise<Buffer> {
    const html = await this.renderTemplate('report', {
      report,
      organization: org,
      generatedAt: new Date(),
    });

    return this.pdfService.generateFromHtml(html, {
      format: 'A4',
      landscape: report.columns.length > 6,
    });
  }
}
```

## API Endpoints

```
GET /api/reports/:reportType?format=xlsx  - Export to Excel
GET /api/reports/:reportType?format=pdf   - Export to PDF

# Supported reportType values:
# - sales/by-customer
# - sales/by-item
# - sales/receivables-aging
# - inventory/summary
# - inventory/valuation
# - inventory/stock-aging
# - purchases/by-vendor
# - purchases/payables-aging
```

## Frontend Components

### ExportDropdown Component
```tsx
interface ExportDropdownProps {
  onExport: (format: 'xlsx' | 'pdf') => void;
  loading?: boolean;
}

const ExportDropdown: React.FC<ExportDropdownProps> = ({ onExport, loading }) => {
  const items: MenuProps['items'] = [
    {
      key: 'xlsx',
      label: 'Export to Excel',
      icon: <FileExcelOutlined />,
      onClick: () => onExport('xlsx'),
    },
    {
      key: 'pdf',
      label: 'Export to PDF',
      icon: <FilePdfOutlined />,
      onClick: () => onExport('pdf'),
    },
  ];

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <Button loading={loading}>
        Export <DownOutlined />
      </Button>
    </Dropdown>
  );
};
```

### useReportExport Hook
```tsx
const useReportExport = (reportType: string, filters: ReportFilters) => {
  const [loading, setLoading] = useState(false);

  const exportReport = async (format: 'xlsx' | 'pdf') => {
    setLoading(true);
    try {
      const response = await api.get(`/reports/${reportType}`, {
        params: { ...filters, format },
        responseType: 'blob',
      });

      const filename = `${reportType}-${format(new Date(), 'yyyy-MM-dd')}.${format}`;
      downloadBlob(response.data, filename);
    } finally {
      setLoading(false);
    }
  };

  return { exportReport, loading };
};
```

### downloadBlob Utility
```typescript
function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
```

## Excel Formatting

```typescript
// Currency columns
{
  numFmt: '"RM "#,##0.00',
}

// Percentage columns
{
  numFmt: '0.00%',
}

// Date columns
{
  numFmt: 'dd/mm/yyyy',
}
```

## PDF Template Structure

```handlebars
{{!-- templates/pdf/report.hbs --}}
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; font-size: 10pt; }
    .header { display: flex; justify-content: space-between; }
    .company-info { font-weight: bold; }
    .report-title { text-align: center; margin: 20px 0; }
    .filters { color: #666; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f0f0f0; padding: 8px; text-align: left; border-bottom: 2px solid #333; }
    td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
    .number { text-align: right; }
    .summary-row { font-weight: bold; background: #f5f5f5; }
    .footer { margin-top: 20px; text-align: center; color: #999; font-size: 8pt; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">{{organization.name}}</div>
    <div class="date">Generated: {{formatDate generatedAt}}</div>
  </div>

  <h1 class="report-title">{{report.title}}</h1>

  <div class="filters">
    Period: {{report.period.startDate}} to {{report.period.endDate}}
  </div>

  <table>
    <thead>
      <tr>
        {{#each report.columns}}
          <th>{{this.title}}</th>
        {{/each}}
      </tr>
    </thead>
    <tbody>
      {{#each report.rows}}
        <tr>
          {{#each ../report.columns}}
            <td class="{{#if this.isNumber}}number{{/if}}">
              {{lookup ../this this.dataIndex}}
            </td>
          {{/each}}
        </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="footer">
    Page {{page}} of {{pages}}
  </div>
</body>
</html>
```

## Dependencies

```json
{
  "exceljs": "^4.4.0",
  "puppeteer": "^21.0.0"
}
```
