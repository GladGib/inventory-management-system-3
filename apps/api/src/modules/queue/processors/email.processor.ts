import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing email job ${job.id}: ${job.name}`);

    switch (job.name) {
      case 'send-invoice':
        await this.sendInvoiceEmail(job.data);
        break;
      case 'send-purchase-order':
        await this.sendPurchaseOrderEmail(job.data);
        break;
      case 'send-payment-receipt':
        await this.sendPaymentReceiptEmail(job.data);
        break;
      case 'send-order-confirmation':
        await this.sendOrderConfirmationEmail(job.data);
        break;
      case 'send-welcome':
        await this.sendWelcomeEmail(job.data);
        break;
      case 'send-test':
        await this.sendTestEmail(job.data);
        break;
      default:
        this.logger.warn(`Unknown email job: ${job.name}`);
    }
  }

  private async sendInvoiceEmail(data: {
    organizationId: string;
    invoiceId: string;
    createdById?: string;
    pdfBuffer?: number[];
  }): Promise<void> {
    this.logger.log(
      `Sending invoice email for invoice ${data.invoiceId} (org: ${data.organizationId})`,
    );
    // Will integrate with EmailService once injected
    // The processor currently logs; full integration is done in the queue service layer
  }

  private async sendPurchaseOrderEmail(data: {
    organizationId: string;
    purchaseOrderId: string;
    createdById?: string;
    pdfBuffer?: number[];
  }): Promise<void> {
    this.logger.log(
      `Sending PO email for PO ${data.purchaseOrderId} (org: ${data.organizationId})`,
    );
  }

  private async sendPaymentReceiptEmail(data: {
    organizationId: string;
    paymentId: string;
    createdById?: string;
  }): Promise<void> {
    this.logger.log(
      `Sending payment receipt for payment ${data.paymentId} (org: ${data.organizationId})`,
    );
  }

  private async sendOrderConfirmationEmail(data: {
    organizationId: string;
    salesOrderId: string;
    createdById?: string;
  }): Promise<void> {
    this.logger.log(
      `Sending order confirmation for order ${data.salesOrderId} (org: ${data.organizationId})`,
    );
  }

  private async sendWelcomeEmail(data: {
    to: string;
    userName: string;
    organizationName?: string;
  }): Promise<void> {
    this.logger.log(`Sending welcome email to ${data.to}`);
  }

  private async sendTestEmail(data: {
    organizationId: string;
    toEmail: string;
    createdById?: string;
  }): Promise<void> {
    this.logger.log(`Sending test email to ${data.toEmail}`);
  }
}
