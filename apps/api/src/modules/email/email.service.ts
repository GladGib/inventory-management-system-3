import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { PrismaService } from '@/prisma/prisma.service';

interface EmailOptions {
  to: string;
  cc?: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private templates: Map<string, Handlebars.TemplateDelegate> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.registerHelpers();
    this.loadTemplates();
  }

  private registerHelpers() {
    Handlebars.registerHelper('formatDate', (date: Date | string) => {
      if (!date) return '-';
      const d = new Date(date);
      return d.toLocaleDateString('en-MY', {
        day: '2-digit',
        month: 'long',
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
  }

  private loadTemplates() {
    const templatesDir = path.join(__dirname, '..', '..', 'templates', 'email');

    try {
      if (fs.existsSync(templatesDir)) {
        const files = fs.readdirSync(templatesDir);
        files.forEach((file) => {
          if (file.endsWith('.hbs')) {
            const templateName = file.replace('.hbs', '');
            const templateContent = fs.readFileSync(
              path.join(templatesDir, file),
              'utf-8',
            );
            this.templates.set(templateName, Handlebars.compile(templateContent));
          }
        });
        this.logger.log(`Loaded ${this.templates.size} email templates`);
      }
    } catch (error) {
      this.logger.warn('Could not load email templates:', error);
    }
  }

  private async getTransporter(organizationId: string): Promise<nodemailer.Transporter | null> {
    // First try to get organization-specific SMTP settings
    const orgSettings = await this.prisma.organizationEmailSettings.findUnique({
      where: { organizationId },
    });

    if (orgSettings?.smtpHost && orgSettings?.smtpUser) {
      return nodemailer.createTransport({
        host: orgSettings.smtpHost,
        port: orgSettings.smtpPort || 587,
        secure: orgSettings.smtpSecure,
        auth: {
          user: orgSettings.smtpUser,
          pass: orgSettings.smtpPass || '',
        },
      });
    }

    // Fall back to environment SMTP settings
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');

    if (smtpHost && smtpUser) {
      return nodemailer.createTransport({
        host: smtpHost,
        port: this.configService.get<number>('SMTP_PORT', 587),
        secure: this.configService.get<boolean>('SMTP_SECURE', false),
        auth: {
          user: smtpUser,
          pass: this.configService.get<string>('SMTP_PASS', ''),
        },
      });
    }

    return null;
  }

  private async getEmailSettings(organizationId: string) {
    const settings = await this.prisma.organizationEmailSettings.findUnique({
      where: { organizationId },
    });

    return {
      fromName: settings?.fromName || this.configService.get('SMTP_FROM_NAME', 'IMS'),
      fromEmail: settings?.fromEmail || this.configService.get('SMTP_FROM_EMAIL', 'noreply@example.com'),
      replyTo: settings?.replyTo || settings?.fromEmail || this.configService.get('SMTP_FROM_EMAIL'),
      signature: settings?.signature || '',
      autoSendInvoice: settings?.autoSendInvoice || false,
      autoSendPayment: settings?.autoSendPayment || false,
      autoSendOrder: settings?.autoSendOrder || false,
      autoSendPO: settings?.autoSendPO || false,
    };
  }

  async sendEmail(
    organizationId: string,
    options: EmailOptions,
    emailType: string = 'CUSTOM',
    referenceType?: string,
    referenceId?: string,
    createdById?: string,
  ): Promise<SendEmailResult> {
    const transporter = await this.getTransporter(organizationId);

    if (!transporter) {
      this.logger.warn('No email configuration found');

      // Log the failed attempt
      await this.logEmail(organizationId, {
        ...options,
        type: emailType,
        status: 'FAILED',
        error: 'No email configuration found',
        referenceType,
        referenceId,
        createdById,
      });

      return {
        success: false,
        error: 'Email not configured. Please configure SMTP settings.',
      };
    }

    const settings = await this.getEmailSettings(organizationId);

    try {
      const result = await transporter.sendMail({
        from: `"${settings.fromName}" <${settings.fromEmail}>`,
        replyTo: settings.replyTo || undefined,
        to: options.to,
        cc: options.cc,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      });

      const messageId = (result as { messageId?: string }).messageId;
      this.logger.log(`Email sent successfully: ${messageId}`);

      // Log successful send
      await this.logEmail(organizationId, {
        ...options,
        type: emailType,
        status: 'SENT',
        referenceType,
        referenceId,
        createdById,
      });

      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${error.message}`);

      // Log failed send
      await this.logEmail(organizationId, {
        ...options,
        type: emailType,
        status: 'FAILED',
        error: error.message,
        referenceType,
        referenceId,
        createdById,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async logEmail(
    organizationId: string,
    data: {
      to: string;
      cc?: string;
      subject: string;
      html?: string;
      type: string;
      status: string;
      error?: string;
      referenceType?: string;
      referenceId?: string;
      createdById?: string;
    },
  ) {
    try {
      await this.prisma.emailLog.create({
        data: {
          organizationId,
          to: data.to,
          cc: data.cc,
          subject: data.subject,
          body: data.html,
          type: data.type as any,
          status: data.status as any,
          error: data.error,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          createdById: data.createdById,
          sentAt: data.status === 'SENT' ? new Date() : undefined,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log email:', error);
    }
  }

  renderTemplate(templateName: string, data: any): string {
    const template = this.templates.get(templateName);
    if (template) {
      return template(data);
    }

    // Return inline templates for built-in email types
    switch (templateName) {
      case 'invoice-email':
        return this.getInvoiceEmailTemplate(data);
      case 'payment-receipt':
        return this.getPaymentReceiptTemplate(data);
      case 'order-confirmation':
        return this.getOrderConfirmationTemplate(data);
      case 'po-issued':
        return this.getPOIssuedTemplate(data);
      default:
        throw new Error(`Template ${templateName} not found`);
    }
  }

  // ============ Send Invoice Email ============

  async sendInvoiceEmail(
    organizationId: string,
    invoiceId: string,
    createdById?: string,
    pdfAttachment?: Buffer,
  ): Promise<SendEmailResult> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        organization: true,
        items: { include: { item: true } },
      },
    });

    if (!invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    if (!invoice.customer.email) {
      return { success: false, error: 'Customer email not found' };
    }

    const settings = await this.getEmailSettings(organizationId);

    const html = this.renderTemplate('invoice-email', {
      invoice,
      customer: invoice.customer,
      organization: invoice.organization,
      signature: settings.signature,
    });

    const attachments = pdfAttachment
      ? [
          {
            filename: `Invoice-${invoice.invoiceNumber}.pdf`,
            content: pdfAttachment,
            contentType: 'application/pdf',
          },
        ]
      : [];

    return this.sendEmail(
      organizationId,
      {
        to: invoice.customer.email,
        subject: `Invoice ${invoice.invoiceNumber} from ${invoice.organization.name}`,
        html,
        attachments,
      },
      'INVOICE_CREATED',
      'invoice',
      invoiceId,
      createdById,
    );
  }

  // ============ Send Payment Receipt ============

  async sendPaymentReceipt(
    organizationId: string,
    paymentId: string,
    createdById?: string,
  ): Promise<SendEmailResult> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        customer: true,
        allocations: {
          include: {
            invoice: true,
          },
        },
      },
    });

    if (!payment) {
      return { success: false, error: 'Payment not found' };
    }

    if (!payment.customer.email) {
      return { success: false, error: 'Customer email not found' };
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    const settings = await this.getEmailSettings(organizationId);

    const html = this.renderTemplate('payment-receipt', {
      payment,
      customer: payment.customer,
      organization,
      allocations: payment.allocations,
      signature: settings.signature,
    });

    return this.sendEmail(
      organizationId,
      {
        to: payment.customer.email,
        subject: `Payment Receipt ${payment.paymentNumber} from ${organization?.name}`,
        html,
      },
      'PAYMENT_RECEIVED',
      'payment',
      paymentId,
      createdById,
    );
  }

  // ============ Send Order Confirmation ============

  async sendOrderConfirmation(
    organizationId: string,
    salesOrderId: string,
    createdById?: string,
  ): Promise<SendEmailResult> {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: {
        customer: true,
        organization: true,
        items: { include: { item: true } },
      },
    });

    if (!order) {
      return { success: false, error: 'Sales order not found' };
    }

    if (!order.customer.email) {
      return { success: false, error: 'Customer email not found' };
    }

    const settings = await this.getEmailSettings(organizationId);

    const html = this.renderTemplate('order-confirmation', {
      order,
      customer: order.customer,
      organization: order.organization,
      items: order.items,
      signature: settings.signature,
    });

    return this.sendEmail(
      organizationId,
      {
        to: order.customer.email,
        subject: `Order Confirmation ${order.orderNumber} from ${order.organization.name}`,
        html,
      },
      'ORDER_CONFIRMED',
      'sales_order',
      salesOrderId,
      createdById,
    );
  }

  // ============ Send PO to Vendor ============

  async sendPOToVendor(
    organizationId: string,
    purchaseOrderId: string,
    createdById?: string,
    pdfAttachment?: Buffer,
  ): Promise<SendEmailResult> {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        vendor: true,
        organization: true,
        items: { include: { item: true } },
      },
    });

    if (!po) {
      return { success: false, error: 'Purchase order not found' };
    }

    if (!po.vendor.email) {
      return { success: false, error: 'Vendor email not found' };
    }

    const settings = await this.getEmailSettings(organizationId);

    const html = this.renderTemplate('po-issued', {
      purchaseOrder: po,
      vendor: po.vendor,
      organization: po.organization,
      items: po.items,
      signature: settings.signature,
    });

    const attachments = pdfAttachment
      ? [
          {
            filename: `PO-${po.orderNumber}.pdf`,
            content: pdfAttachment,
            contentType: 'application/pdf',
          },
        ]
      : [];

    return this.sendEmail(
      organizationId,
      {
        to: po.vendor.email,
        subject: `Purchase Order ${po.orderNumber} from ${po.organization.name}`,
        html,
        attachments,
      },
      'PO_ISSUED',
      'purchase_order',
      purchaseOrderId,
      createdById,
    );
  }

  // ============ Test Email Connection ============

  async testEmailConnection(organizationId: string): Promise<SendEmailResult> {
    const transporter = await this.getTransporter(organizationId);

    if (!transporter) {
      return {
        success: false,
        error: 'No email configuration found',
      };
    }

    try {
      await transporter.verify();
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendTestEmail(
    organizationId: string,
    toEmail: string,
    createdById?: string,
  ): Promise<SendEmailResult> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1890ff;">Test Email</h2>
        <p>This is a test email from ${organization?.name || 'IMS'}.</p>
        <p>If you received this email, your email configuration is working correctly.</p>
        <hr style="border: none; border-top: 1px solid #e8e8e8; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">
          Sent from IMS - Inventory Management System
        </p>
      </div>
    `;

    return this.sendEmail(
      organizationId,
      {
        to: toEmail,
        subject: `Test Email from ${organization?.name || 'IMS'}`,
        html,
      },
      'CUSTOM',
      undefined,
      undefined,
      createdById,
    );
  }

  // ============ Get Email Logs ============

  async getEmailLogs(
    organizationId: string,
    options: { page?: number; limit?: number; type?: string; status?: string } = {},
  ) {
    const { page = 1, limit = 25, type, status } = options;

    const where: any = { organizationId };
    if (type) where.type = type;
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============ Inline Email Templates ============

  private getInvoiceEmailTemplate(data: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h2 { color: #1890ff; margin: 0; }
    .details { background: #f5f5f5; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .details p { margin: 5px 0; }
    .amount { font-size: 24px; font-weight: bold; color: #1890ff; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e8e8e8; color: #666; font-size: 12px; }
    .btn { display: inline-block; padding: 10px 20px; background: #1890ff; color: white; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>${data.organization?.name || 'Company'}</h2>
    </div>

    <p>Dear ${data.customer?.displayName || 'Customer'},</p>

    <p>Please find attached invoice <strong>${data.invoice?.invoiceNumber}</strong> for your recent purchase.</p>

    <div class="details">
      <p><strong>Invoice Number:</strong> ${data.invoice?.invoiceNumber}</p>
      <p><strong>Invoice Date:</strong> ${new Date(data.invoice?.invoiceDate).toLocaleDateString('en-MY')}</p>
      <p><strong>Due Date:</strong> ${new Date(data.invoice?.dueDate).toLocaleDateString('en-MY')}</p>
      <p class="amount">Amount Due: RM ${Number(data.invoice?.balance || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
    </div>

    <p>The invoice is attached to this email as a PDF document.</p>

    <p>If you have any questions, please don't hesitate to contact us.</p>

    <div class="footer">
      <p>${data.organization?.name || ''}</p>
      <p>${data.organization?.phone || ''}</p>
      <p>${data.organization?.email || ''}</p>
      ${data.signature ? `<div>${data.signature}</div>` : ''}
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private getPaymentReceiptTemplate(data: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h2 { color: #52c41a; margin: 0; }
    .details { background: #f6ffed; padding: 15px; border-radius: 4px; margin-bottom: 20px; border: 1px solid #b7eb8f; }
    .details p { margin: 5px 0; }
    .amount { font-size: 24px; font-weight: bold; color: #52c41a; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e8e8e8; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Payment Receipt</h2>
    </div>

    <p>Dear ${data.customer?.displayName || 'Customer'},</p>

    <p>Thank you for your payment. Here are the details of your payment:</p>

    <div class="details">
      <p><strong>Payment Number:</strong> ${data.payment?.paymentNumber}</p>
      <p><strong>Payment Date:</strong> ${new Date(data.payment?.paymentDate).toLocaleDateString('en-MY')}</p>
      <p><strong>Payment Method:</strong> ${data.payment?.paymentMethod}</p>
      <p class="amount">Amount Paid: RM ${Number(data.payment?.amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
    </div>

    <p>Thank you for your business!</p>

    <div class="footer">
      <p>${data.organization?.name || ''}</p>
      <p>${data.organization?.phone || ''}</p>
      ${data.signature ? `<div>${data.signature}</div>` : ''}
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private getOrderConfirmationTemplate(data: any): string {
    const itemRows = data.items
      ?.map(
        (item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e8e8e8;">${item.item?.name || ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e8e8e8; text-align: right;">${Number(item.quantity).toLocaleString('en-MY')}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e8e8e8; text-align: right;">RM ${Number(item.rate || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e8e8e8; text-align: right;">RM ${Number(item.amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
      </tr>
    `,
      )
      .join('') || '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h2 { color: #1890ff; margin: 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #fafafa; padding: 10px 8px; text-align: left; border-bottom: 2px solid #e8e8e8; }
    .total { font-weight: bold; background: #f5f5f5; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e8e8e8; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Order Confirmation</h2>
    </div>

    <p>Dear ${data.customer?.displayName || 'Customer'},</p>

    <p>Thank you for your order. Here are the details:</p>

    <p><strong>Order Number:</strong> ${data.order?.orderNumber}</p>
    <p><strong>Order Date:</strong> ${new Date(data.order?.orderDate).toLocaleDateString('en-MY')}</p>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: right;">Qty</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        <tr class="total">
          <td colspan="3" style="padding: 10px 8px; text-align: right;">Total:</td>
          <td style="padding: 10px 8px; text-align: right;">RM ${Number(data.order?.total || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    <p>We will process your order shortly.</p>

    <div class="footer">
      <p>${data.organization?.name || ''}</p>
      <p>${data.organization?.phone || ''}</p>
      ${data.signature ? `<div>${data.signature}</div>` : ''}
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private getPOIssuedTemplate(data: any): string {
    const itemRows = data.items
      ?.map(
        (item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e8e8e8;">${item.item?.name || ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e8e8e8; text-align: right;">${Number(item.quantity).toLocaleString('en-MY')}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e8e8e8; text-align: right;">RM ${Number(item.unitPrice || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e8e8e8; text-align: right;">RM ${Number(item.total || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
      </tr>
    `,
      )
      .join('') || '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1890ff; padding-bottom: 20px; }
    .header h2 { color: #1890ff; margin: 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #1890ff; color: white; padding: 10px 8px; text-align: left; }
    .total { font-weight: bold; background: #e6f7ff; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e8e8e8; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Purchase Order</h2>
      <p><strong>${data.organization?.name || ''}</strong></p>
    </div>

    <p>Dear ${data.vendor?.displayName || 'Vendor'},</p>

    <p>Please find below our purchase order:</p>

    <p><strong>PO Number:</strong> ${data.purchaseOrder?.orderNumber}</p>
    <p><strong>Order Date:</strong> ${new Date(data.purchaseOrder?.orderDate).toLocaleDateString('en-MY')}</p>
    ${data.purchaseOrder?.expectedDate ? `<p><strong>Expected Delivery:</strong> ${new Date(data.purchaseOrder.expectedDate).toLocaleDateString('en-MY')}</p>` : ''}

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: right;">Qty</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        <tr class="total">
          <td colspan="3" style="padding: 10px 8px; text-align: right;">Total:</td>
          <td style="padding: 10px 8px; text-align: right;">RM ${Number(data.purchaseOrder?.total || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    <p>Please confirm receipt of this order and the expected delivery date.</p>

    <div class="footer">
      <p>${data.organization?.name || ''}</p>
      <p>${data.organization?.phone || ''}</p>
      <p>${data.organization?.email || ''}</p>
      ${data.signature ? `<div>${data.signature}</div>` : ''}
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
