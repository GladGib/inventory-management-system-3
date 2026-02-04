import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface PdfGenerateOptions {
  format?: 'A4' | 'Letter';
  landscape?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
}

export interface OrganizationInfo {
  name: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  sstNumber?: string;
  businessRegNo?: string;
  tin?: string;
  logoUrl?: string;
}

export interface LineItemData {
  sku?: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount: number;
  amount: number;
}

export interface AddressData {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export interface ContactInfo {
  displayName: string;
  companyName?: string;
  email?: string;
  phone?: string;
  taxNumber?: string;
  billingAddress?: AddressData;
  shippingAddress?: AddressData;
}

export interface SalesOrderPdfData {
  organization: OrganizationInfo;
  documentNumber: string;
  orderDate: string;
  expectedShipDate?: string;
  customer: ContactInfo;
  items: LineItemData[];
  subtotal: number;
  discountAmount: number;
  shippingCharges: number;
  taxAmount: number;
  total: number;
  notes?: string;
  termsConditions?: string;
  status: string;
}

export interface InvoicePdfData extends SalesOrderPdfData {
  invoiceDate: string;
  dueDate: string;
  amountPaid: number;
  balance: number;
  isPaid: boolean;
  paymentTermDays: number;
  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
  eInvoiceQrCode?: string;
}

export interface PurchaseOrderPdfData {
  organization: OrganizationInfo;
  documentNumber: string;
  orderDate: string;
  expectedDate?: string;
  vendor: ContactInfo;
  items: LineItemData[];
  subtotal: number;
  discountAmount: number;
  shippingCharges: number;
  taxAmount: number;
  total: number;
  notes?: string;
  termsConditions?: string;
  deliveryInstructions?: string;
  status: string;
}

export interface BillPdfData {
  organization: OrganizationInfo;
  documentNumber: string;
  vendorBillNumber?: string;
  billDate: string;
  dueDate: string;
  vendor: ContactInfo;
  items: LineItemData[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balance: number;
  notes?: string;
  status: string;
  purchaseOrderNumber?: string;
}

@Injectable()
export class PdfService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browser: puppeteer.Browser | null = null;
  private templates: Map<string, Handlebars.TemplateDelegate> = new Map();
  private readonly templatesPath: string;

  constructor() {
    this.templatesPath = path.join(__dirname, '..', '..', '..', 'templates');
    this.registerHandlebarsHelpers();
  }

  async onModuleInit() {
    await this.loadTemplates();
  }

  async onModuleDestroy() {
    await this.closeBrowser();
  }

  private registerHandlebarsHelpers() {
    // Format currency in Malaysian Ringgit
    Handlebars.registerHelper('formatCurrency', (amount: number) => {
      if (amount === null || amount === undefined || isNaN(amount)) return 'RM 0.00';
      return `RM ${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    });

    // Format date in DD/MM/YYYY format
    Handlebars.registerHelper('formatDate', (dateStr: string) => {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    });

    // Format number with decimal places
    Handlebars.registerHelper('formatNumber', (num: number, decimals: number = 2) => {
      if (num === null || num === undefined || isNaN(num)) return '0';
      return Number(num).toFixed(decimals);
    });

    // Format percentage
    Handlebars.registerHelper('formatPercent', (num: number) => {
      if (num === null || num === undefined || isNaN(num)) return '0%';
      return `${Number(num).toFixed(2)}%`;
    });

    // Conditional equals helper
    Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);

    // Greater than helper
    Handlebars.registerHelper('gt', (a: number, b: number) => a > b);

    // Less than helper
    Handlebars.registerHelper('lt', (a: number, b: number) => a < b);

    // Index helper for table row numbers
    Handlebars.registerHelper('inc', (num: number) => num + 1);

    // Format address
    Handlebars.registerHelper('formatAddress', (address: AddressData | null | undefined) => {
      if (!address) return '';
      const parts: string[] = [];
      if (address.line1) parts.push(address.line1);
      if (address.line2) parts.push(address.line2);
      const cityState: string[] = [];
      if (address.city) cityState.push(address.city);
      if (address.state) cityState.push(address.state);
      if (address.postcode) cityState.push(address.postcode);
      if (cityState.length > 0) parts.push(cityState.join(', '));
      if (address.country) parts.push(address.country);
      return new Handlebars.SafeString(parts.join('<br>'));
    });

    // Check if value exists and is truthy
    Handlebars.registerHelper('ifExists', function(this: unknown, value: unknown, options: Handlebars.HelperOptions) {
      if (value !== null && value !== undefined && value !== '') {
        return options.fn(this);
      }
      return options.inverse(this);
    });
  }

  private async loadTemplates() {
    const templateFiles = [
      'sales-order.hbs',
      'invoice.hbs',
      'purchase-order.hbs',
      'bill.hbs',
    ];

    const partialFiles = [
      'document-header.hbs',
      'document-footer.hbs',
      'line-items-table.hbs',
      'address-block.hbs',
      'totals-section.hbs',
    ];

    // Load partials
    for (const partialFile of partialFiles) {
      const partialPath = path.join(this.templatesPath, 'pdf', 'partials', partialFile);
      if (fs.existsSync(partialPath)) {
        const partialContent = fs.readFileSync(partialPath, 'utf-8');
        const partialName = partialFile.replace('.hbs', '');
        Handlebars.registerPartial(partialName, partialContent);
        this.logger.debug(`Loaded partial: ${partialName}`);
      } else {
        this.logger.warn(`Partial not found: ${partialPath}`);
      }
    }

    // Load main templates
    for (const templateFile of templateFiles) {
      const templatePath = path.join(this.templatesPath, 'pdf', templateFile);
      if (fs.existsSync(templatePath)) {
        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        const templateName = templateFile.replace('.hbs', '');
        this.templates.set(templateName, Handlebars.compile(templateContent));
        this.logger.debug(`Loaded template: ${templateName}`);
      } else {
        this.logger.warn(`Template not found: ${templatePath}`);
      }
    }

    // Load CSS
    const cssPath = path.join(this.templatesPath, 'styles', 'pdf.css');
    if (fs.existsSync(cssPath)) {
      const cssContent = fs.readFileSync(cssPath, 'utf-8');
      Handlebars.registerPartial('styles', `<style>${cssContent}</style>`);
      this.logger.debug('Loaded CSS styles');
    }
  }

  private async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    }
    return this.browser;
  }

  private async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async generatePdf(
    templateName: string,
    data: Record<string, unknown>,
    options: PdfGenerateOptions = {},
  ): Promise<Buffer> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    // Add current date and page info
    const templateData = {
      ...data,
      generatedAt: new Date().toISOString(),
      currentYear: new Date().getFullYear(),
    };

    const html = template(templateData);

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      const pdfBuffer = await page.pdf({
        format: options.format || 'A4',
        landscape: options.landscape || false,
        margin: options.margin || {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
        printBackground: true,
        displayHeaderFooter: options.displayHeaderFooter ?? true,
        headerTemplate: options.headerTemplate || '<div></div>',
        footerTemplate: options.footerTemplate || `
          <div style="width: 100%; font-size: 9px; padding: 0 15mm; display: flex; justify-content: space-between; color: #666;">
            <span>Generated on ${new Date().toLocaleDateString('en-MY')}</span>
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        `,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  async generateSalesOrderPdf(data: SalesOrderPdfData): Promise<Buffer> {
    return this.generatePdf('sales-order', data as unknown as Record<string, unknown>);
  }

  async generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
    return this.generatePdf('invoice', data as unknown as Record<string, unknown>);
  }

  async generatePurchaseOrderPdf(data: PurchaseOrderPdfData): Promise<Buffer> {
    return this.generatePdf('purchase-order', data as unknown as Record<string, unknown>);
  }

  async generateBillPdf(data: BillPdfData): Promise<Buffer> {
    return this.generatePdf('bill', data as unknown as Record<string, unknown>);
  }
}
