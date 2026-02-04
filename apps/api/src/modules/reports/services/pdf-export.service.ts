import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { ReportData } from './excel-export.service';

interface PdfGenerationOptions {
  format?: 'A4' | 'Letter';
  landscape?: boolean;
}

interface Organization {
  name: string;
  address?: any;
  phone?: string;
  email?: string;
}

@Injectable()
export class PdfExportService {
  private templates: Map<string, Handlebars.TemplateDelegate> = new Map();

  constructor() {
    this.registerHelpers();
    this.loadTemplates();
  }

  private registerHelpers() {
    Handlebars.registerHelper('formatDate', (date: Date | string) => {
      if (!date) return '-';
      const d = new Date(date);
      return d.toLocaleDateString('en-MY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    });

    Handlebars.registerHelper('formatCurrency', (value: number) => {
      if (value === null || value === undefined) return 'RM 0.00';
      return `RM ${Number(value).toLocaleString('en-MY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    });

    Handlebars.registerHelper('formatNumber', (value: number) => {
      if (value === null || value === undefined) return '0';
      return Number(value).toLocaleString('en-MY');
    });

    Handlebars.registerHelper('formatPercent', (value: number) => {
      if (value === null || value === undefined) return '0%';
      return `${(Number(value) * 100).toFixed(2)}%`;
    });

    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
    Handlebars.registerHelper('lt', (a: number, b: number) => a < b);

    Handlebars.registerHelper('lookup', (obj: any, key: string) => {
      return obj && obj[key];
    });
  }

  private loadTemplates() {
    const templatesDir = path.join(__dirname, '..', '..', '..', 'templates', 'pdf');

    // Try to load templates from the templates directory
    try {
      if (fs.existsSync(templatesDir)) {
        const files = fs.readdirSync(templatesDir);
        files.forEach(file => {
          if (file.endsWith('.hbs')) {
            const templateName = file.replace('.hbs', '');
            const templateContent = fs.readFileSync(path.join(templatesDir, file), 'utf-8');
            this.templates.set(templateName, Handlebars.compile(templateContent));
          }
        });
      }
    } catch (error) {
      console.warn('Could not load PDF templates:', error);
    }
  }

  async generateReportPdf(
    report: ReportData,
    organization: Organization,
    options?: PdfGenerationOptions
  ): Promise<Buffer> {
    // Generate HTML content
    const html = this.renderReportTemplate(report, organization);

    // For now, return HTML as a buffer (in production, use Puppeteer or similar)
    // This is a simplified implementation that returns HTML
    return Buffer.from(html, 'utf-8');
  }

  renderReportTemplate(report: ReportData, organization: Organization): string {
    const template = this.templates.get('report');

    if (template) {
      return template({
        report,
        organization,
        generatedAt: new Date(),
      });
    }

    // Fallback to inline template if file template doesn't exist
    return this.getInlineReportTemplate(report, organization);
  }

  private getInlineReportTemplate(report: ReportData, organization: Organization): string {
    const formatCurrency = (v: number) => `RM ${Number(v || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatDate = (d: any) => d ? new Date(d).toLocaleDateString('en-MY') : '-';
    const formatNumber = (v: number) => Number(v || 0).toLocaleString('en-MY');

    const rows = report.rows.map(row => {
      const cells = report.columns.map(col => {
        let value = row[col.dataIndex];
        const isNumber = col.type === 'number' || col.type === 'currency' || col.type === 'percentage';

        switch (col.type) {
          case 'currency':
            value = formatCurrency(value);
            break;
          case 'date':
            value = formatDate(value);
            break;
          case 'number':
            value = formatNumber(value);
            break;
          case 'percentage':
            value = `${(Number(value) * 100).toFixed(2)}%`;
            break;
        }

        return `<td class="${isNumber ? 'number' : ''}">${value ?? '-'}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    const headerCells = report.columns.map(col => {
      const isNumber = col.type === 'number' || col.type === 'currency' || col.type === 'percentage';
      return `<th class="${isNumber ? 'number' : ''}">${col.title}</th>`;
    }).join('');

    const summaryRow = report.summary ? `
      <tr class="summary-row">
        ${report.columns.map((col, i) => {
          const value = report.summary![col.dataIndex];
          if (value === undefined) return i === 0 ? '<td><strong>Total</strong></td>' : '<td></td>';

          let formattedValue = value;
          switch (col.type) {
            case 'currency':
              formattedValue = formatCurrency(value);
              break;
            case 'number':
              formattedValue = formatNumber(value);
              break;
            case 'percentage':
              formattedValue = `${(Number(value) * 100).toFixed(2)}%`;
              break;
          }

          const isNumber = col.type === 'number' || col.type === 'currency' || col.type === 'percentage';
          return `<td class="${isNumber ? 'number' : ''}"><strong>${formattedValue}</strong></td>`;
        }).join('')}
      </tr>
    ` : '';

    const filters = report.filters ? Object.entries(report.filters)
      .map(([key, value]) => `<span class="filter-item">${key}: ${value}</span>`)
      .join(' | ') : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${report.title}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #333; margin: 0; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #1890ff; padding-bottom: 15px; }
    .company-info { font-weight: bold; font-size: 14pt; }
    .company-details { font-size: 9pt; color: #666; margin-top: 5px; }
    .date-info { text-align: right; font-size: 9pt; color: #666; }
    .report-title { text-align: center; margin: 20px 0; font-size: 16pt; font-weight: bold; color: #1890ff; }
    .filters { color: #666; margin-bottom: 15px; font-size: 9pt; background: #f5f5f5; padding: 8px 12px; border-radius: 4px; }
    .filter-item { margin-right: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #1890ff; color: white; padding: 10px 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #0050b3; }
    th.number { text-align: right; }
    td { padding: 8px; border-bottom: 1px solid #e8e8e8; }
    td.number { text-align: right; }
    tr:nth-child(even) { background: #fafafa; }
    tr:hover { background: #e6f7ff; }
    .summary-row { background: #e6f7ff !important; font-weight: bold; }
    .summary-row td { border-top: 2px solid #1890ff; padding-top: 10px; }
    .footer { margin-top: 30px; padding-top: 15px; text-align: center; color: #999; font-size: 8pt; border-top: 1px solid #e8e8e8; }
    .page-number { position: fixed; bottom: 10mm; right: 15mm; font-size: 8pt; color: #999; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-info">${organization.name}</div>
      <div class="company-details">
        ${organization.phone ? organization.phone + '<br>' : ''}
        ${organization.email || ''}
      </div>
    </div>
    <div class="date-info">
      Generated: ${new Date().toLocaleString('en-MY')}
    </div>
  </div>

  <h1 class="report-title">${report.title}</h1>

  ${filters ? `<div class="filters">${filters}</div>` : ''}

  <table>
    <thead>
      <tr>
        ${headerCells}
      </tr>
    </thead>
    <tbody>
      ${rows}
      ${summaryRow}
    </tbody>
  </table>

  <div class="footer">
    Generated by IMS - Inventory Management System
  </div>
</body>
</html>
    `.trim();
  }

  renderEmailTemplate(templateName: string, data: any): string {
    const template = this.templates.get(templateName);
    if (template) {
      return template(data);
    }
    throw new Error(`Template ${templateName} not found`);
  }
}
