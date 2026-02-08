import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('inventory')
export class InventoryProcessor extends WorkerHost {
  private readonly logger = new Logger(InventoryProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing inventory job ${job.id}: ${job.name}`);

    switch (job.name) {
      case 'reorder-check':
        await this.checkReorderPoints(job);
        break;
      case 'stock-valuation':
        await this.calculateStockValuation(job);
        break;
      case 'batch-expiry-check':
        await this.checkBatchExpiry(job);
        break;
      case 'low-stock-alert':
        await this.processLowStockAlert(job);
        break;
      default:
        this.logger.warn(`Unknown inventory job: ${job.name}`);
    }
  }

  private async checkReorderPoints(job: Job): Promise<void> {
    const { organizationId } = job.data;
    this.logger.log(
      `Checking reorder points for org ${organizationId || 'all organizations'}`,
    );

    await job.updateProgress(10);

    // Will integrate with ReorderService.checkReorderPoints()
    // For recurring jobs without an organizationId, iterate all orgs
    await job.updateProgress(100);

    this.logger.log('Reorder points check complete');
  }

  private async calculateStockValuation(job: Job): Promise<void> {
    const { organizationId, warehouseId, method } = job.data;
    this.logger.log(
      `Calculating stock valuation for org ${organizationId} (method: ${method || 'WEIGHTED_AVERAGE'})`,
    );

    await job.updateProgress(10);

    // Will integrate with InventoryService for valuation calculations
    await job.updateProgress(100);

    this.logger.log(
      `Stock valuation complete for org ${organizationId}`,
    );
  }

  private async checkBatchExpiry(job: Job): Promise<void> {
    const { organizationId, daysThreshold } = job.data;
    this.logger.log(
      `Checking batch expiry for org ${organizationId || 'all organizations'} (threshold: ${daysThreshold || 30} days)`,
    );

    await job.updateProgress(10);

    // Will integrate with InventoryService to find batches nearing expiry
    await job.updateProgress(100);

    this.logger.log('Batch expiry check complete');
  }

  private async processLowStockAlert(job: Job): Promise<void> {
    const { organizationId, itemId, currentStock, reorderLevel } = job.data;
    this.logger.log(
      `Processing low stock alert for item ${itemId} in org ${organizationId} ` +
        `(stock: ${currentStock}, reorder level: ${reorderLevel})`,
    );

    // Will integrate with notification/email system for alerting
  }
}
