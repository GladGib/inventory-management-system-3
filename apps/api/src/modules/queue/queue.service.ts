import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('email') private readonly emailQueue: Queue,
    @InjectQueue('reports') private readonly reportsQueue: Queue,
    @InjectQueue('inventory') private readonly inventoryQueue: Queue,
    @InjectQueue('invoices') private readonly invoicesQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('QueueService initialized - scheduling recurring jobs');
    await this.scheduleRecurringJobs();
  }

  // ============ Email Jobs ============

  async addEmailJob(name: string, data: Record<string, any>, opts?: JobsOptions) {
    const job = await this.emailQueue.add(name, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { age: 24 * 3600 }, // Keep completed jobs for 24 hours
      removeOnFail: { age: 7 * 24 * 3600 }, // Keep failed jobs for 7 days
      ...opts,
    });
    this.logger.log(`Email job added: ${name} (id: ${job.id})`);
    return job;
  }

  async sendInvoiceEmail(
    organizationId: string,
    invoiceId: string,
    createdById?: string,
    pdfBuffer?: Buffer,
  ) {
    return this.addEmailJob('send-invoice', {
      organizationId,
      invoiceId,
      createdById,
      // Convert Buffer to array for JSON serialization in Redis
      pdfBuffer: pdfBuffer ? Array.from(pdfBuffer) : undefined,
    });
  }

  async sendPurchaseOrderEmail(
    organizationId: string,
    purchaseOrderId: string,
    createdById?: string,
    pdfBuffer?: Buffer,
  ) {
    return this.addEmailJob('send-purchase-order', {
      organizationId,
      purchaseOrderId,
      createdById,
      pdfBuffer: pdfBuffer ? Array.from(pdfBuffer) : undefined,
    });
  }

  async sendPaymentReceiptEmail(
    organizationId: string,
    paymentId: string,
    createdById?: string,
  ) {
    return this.addEmailJob('send-payment-receipt', {
      organizationId,
      paymentId,
      createdById,
    });
  }

  async sendOrderConfirmationEmail(
    organizationId: string,
    salesOrderId: string,
    createdById?: string,
  ) {
    return this.addEmailJob('send-order-confirmation', {
      organizationId,
      salesOrderId,
      createdById,
    });
  }

  async sendWelcomeEmail(to: string, userName: string, organizationName?: string) {
    return this.addEmailJob('send-welcome', {
      to,
      userName,
      organizationName,
    });
  }

  // ============ Report Jobs ============

  async addReportJob(name: string, data: Record<string, any>, opts?: JobsOptions) {
    const job = await this.reportsQueue.add(name, data, {
      attempts: 2,
      backoff: { type: 'fixed', delay: 5000 },
      removeOnComplete: { age: 48 * 3600 }, // Keep completed for 48 hours
      removeOnFail: { age: 7 * 24 * 3600 },
      ...opts,
    });
    this.logger.log(`Report job added: ${name} (id: ${job.id})`);
    return job;
  }

  async generateInventoryReport(
    organizationId: string,
    filters?: Record<string, any>,
    requestedById?: string,
  ) {
    return this.addReportJob('generate-inventory-report', {
      organizationId,
      filters,
      requestedById,
    });
  }

  async generateSalesReport(
    organizationId: string,
    dateFrom: string,
    dateTo: string,
    requestedById?: string,
  ) {
    return this.addReportJob('generate-sales-report', {
      organizationId,
      dateFrom,
      dateTo,
      requestedById,
    });
  }

  async generateAccountingExport(
    organizationId: string,
    format: string,
    dateFrom: string,
    dateTo: string,
    requestedById?: string,
  ) {
    return this.addReportJob('generate-accounting-export', {
      organizationId,
      format,
      dateFrom,
      dateTo,
      requestedById,
    });
  }

  async generateExcelExport(
    organizationId: string,
    reportType: string,
    filters?: Record<string, any>,
  ) {
    return this.addReportJob('generate-excel-export', {
      organizationId,
      reportType,
      filters,
    });
  }

  async generatePdfReport(
    organizationId: string,
    reportType: string,
    filters?: Record<string, any>,
  ) {
    return this.addReportJob('generate-pdf-report', {
      organizationId,
      reportType,
      filters,
    });
  }

  // ============ Inventory Jobs ============

  async addInventoryJob(name: string, data: Record<string, any>, opts?: JobsOptions) {
    const job = await this.inventoryQueue.add(name, data, {
      removeOnComplete: { age: 24 * 3600 },
      removeOnFail: { age: 7 * 24 * 3600 },
      ...opts,
    });
    this.logger.log(`Inventory job added: ${name} (id: ${job.id})`);
    return job;
  }

  async checkReorderPoints(organizationId?: string) {
    return this.addInventoryJob('reorder-check', {
      organizationId,
    });
  }

  async calculateStockValuation(
    organizationId: string,
    warehouseId?: string,
    method?: string,
  ) {
    return this.addInventoryJob('stock-valuation', {
      organizationId,
      warehouseId,
      method,
    });
  }

  async checkBatchExpiry(organizationId?: string, daysThreshold?: number) {
    return this.addInventoryJob('batch-expiry-check', {
      organizationId,
      daysThreshold: daysThreshold ?? 30,
    });
  }

  async sendLowStockAlert(
    organizationId: string,
    itemId: string,
    currentStock: number,
    reorderLevel: number,
  ) {
    return this.addInventoryJob('low-stock-alert', {
      organizationId,
      itemId,
      currentStock,
      reorderLevel,
    });
  }

  // ============ Recurring Jobs ============

  async scheduleRecurringJobs() {
    try {
      // Clean up existing repeatable jobs first to avoid duplicates
      const existingInventoryRepeatables = await this.inventoryQueue.getRepeatableJobs();
      for (const job of existingInventoryRepeatables) {
        await this.inventoryQueue.removeRepeatableByKey(job.key);
      }

      // Daily reorder check at 6 AM
      await this.inventoryQueue.add(
        'reorder-check',
        {},
        {
          repeat: { pattern: '0 6 * * *' },
          removeOnComplete: { age: 24 * 3600 },
          removeOnFail: { age: 7 * 24 * 3600 },
        },
      );
      this.logger.log('Scheduled recurring job: reorder-check (daily at 6 AM)');

      // Daily batch expiry check at 7 AM
      await this.inventoryQueue.add(
        'batch-expiry-check',
        { daysThreshold: 30 },
        {
          repeat: { pattern: '0 7 * * *' },
          removeOnComplete: { age: 24 * 3600 },
          removeOnFail: { age: 7 * 24 * 3600 },
        },
      );
      this.logger.log('Scheduled recurring job: batch-expiry-check (daily at 7 AM)');
    } catch (error) {
      this.logger.error('Failed to schedule recurring jobs', error);
    }
  }

  // ============ Queue Status / Monitoring ============

  async getQueueStats() {
    const [
      emailWaiting,
      emailActive,
      emailCompleted,
      emailFailed,
      reportsWaiting,
      reportsActive,
      reportsCompleted,
      reportsFailed,
      inventoryWaiting,
      inventoryActive,
      inventoryCompleted,
      inventoryFailed,
      invoicesWaiting,
      invoicesActive,
      invoicesCompleted,
      invoicesFailed,
    ] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getFailedCount(),
      this.reportsQueue.getWaitingCount(),
      this.reportsQueue.getActiveCount(),
      this.reportsQueue.getCompletedCount(),
      this.reportsQueue.getFailedCount(),
      this.inventoryQueue.getWaitingCount(),
      this.inventoryQueue.getActiveCount(),
      this.inventoryQueue.getCompletedCount(),
      this.inventoryQueue.getFailedCount(),
      this.invoicesQueue.getWaitingCount(),
      this.invoicesQueue.getActiveCount(),
      this.invoicesQueue.getCompletedCount(),
      this.invoicesQueue.getFailedCount(),
    ]);

    return {
      email: {
        waiting: emailWaiting,
        active: emailActive,
        completed: emailCompleted,
        failed: emailFailed,
      },
      reports: {
        waiting: reportsWaiting,
        active: reportsActive,
        completed: reportsCompleted,
        failed: reportsFailed,
      },
      inventory: {
        waiting: inventoryWaiting,
        active: inventoryActive,
        completed: inventoryCompleted,
        failed: inventoryFailed,
      },
      invoices: {
        waiting: invoicesWaiting,
        active: invoicesActive,
        completed: invoicesCompleted,
        failed: invoicesFailed,
      },
    };
  }

  async getJobStatus(queueName: string, jobId: string) {
    let queue: Queue;

    switch (queueName) {
      case 'email':
        queue = this.emailQueue;
        break;
      case 'reports':
        queue = this.reportsQueue;
        break;
      case 'inventory':
        queue = this.inventoryQueue;
        break;
      case 'invoices':
        queue = this.invoicesQueue;
        break;
      default:
        return null;
    }

    const job = await queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    return {
      id: job.id,
      name: job.name,
      data: job.data,
      state,
      progress: job.progress,
      attempts: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    };
  }
}
