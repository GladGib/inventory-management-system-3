import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

export interface BackupInfo {
  filename: string;
  date: Date;
  size: number;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getBackupPath(): string {
    const backupPath = this.config.get<string>('BACKUP_PATH', './backups');
    // Ensure directory exists
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }
    return backupPath;
  }

  /**
   * Create a full backup of all organization data as a JSON file.
   */
  async createBackup(organizationId: string): Promise<BackupInfo> {
    this.logger.log(`Creating backup for organization ${organizationId}`);

    const data = await this.exportOrganizationData(organizationId);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${organizationId}-${timestamp}.json`;
    const backupPath = this.getBackupPath();
    const filePath = path.join(backupPath, filename);

    const jsonContent = JSON.stringify(data, null, 2);

    fs.writeFileSync(filePath, jsonContent, 'utf-8');

    const stats = fs.statSync(filePath);

    this.logger.log(`Backup created: ${filename} (${stats.size} bytes)`);

    return {
      filename,
      date: new Date(),
      size: stats.size,
    };
  }

  /**
   * List all available backups for an organization.
   */
  async listBackups(organizationId: string): Promise<BackupInfo[]> {
    const backupPath = this.getBackupPath();

    if (!fs.existsSync(backupPath)) {
      return [];
    }

    const files = fs.readdirSync(backupPath);
    const prefix = `backup-${organizationId}-`;

    const backups: BackupInfo[] = files
      .filter((f) => f.startsWith(prefix) && f.endsWith('.json'))
      .map((filename) => {
        const filePath = path.join(backupPath, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          date: stats.mtime,
          size: stats.size,
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    return backups;
  }

  /**
   * Restore organization data from a backup file.
   * WARNING: This is a destructive operation that replaces existing data.
   */
  async restoreBackup(organizationId: string, filename: string): Promise<{ message: string; restoredCounts: Record<string, number> }> {
    const backupPath = this.getBackupPath();
    const filePath = path.join(backupPath, filename);

    // Security check: ensure filename matches the organization
    if (!filename.startsWith(`backup-${organizationId}-`)) {
      throw new BadRequestException('Backup file does not belong to this organization');
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Backup file not found: ${filename}`);
    }

    this.logger.log(`Restoring backup ${filename} for organization ${organizationId}`);

    const content = fs.readFileSync(filePath, 'utf-8');
    let data: Record<string, unknown[]>;

    try {
      data = JSON.parse(content);
    } catch {
      throw new BadRequestException('Invalid backup file format');
    }

    // Validate the backup structure
    if (!data.items && !data.contacts && !data.salesOrders && !data.invoices && !data.purchaseOrders) {
      throw new BadRequestException('Backup file does not contain valid organization data');
    }

    const restoredCounts: Record<string, number> = {};

    // Restore in a transaction with proper ordering to handle foreign keys
    await this.prisma.$transaction(async (tx) => {
      // 1. Restore contacts first (referenced by orders/invoices)
      if (data.contacts && Array.isArray(data.contacts)) {
        for (const contact of data.contacts) {
          const contactData = contact as Record<string, unknown>;
          await tx.contact.upsert({
            where: { id: contactData.id as string },
            update: contactData as never,
            create: contactData as never,
          });
        }
        restoredCounts.contacts = data.contacts.length;
      }

      // 2. Restore items
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          const itemData = item as Record<string, unknown>;
          await tx.item.upsert({
            where: { id: itemData.id as string },
            update: itemData as never,
            create: itemData as never,
          });
        }
        restoredCounts.items = data.items.length;
      }

      // 3. Restore sales orders
      if (data.salesOrders && Array.isArray(data.salesOrders)) {
        for (const order of data.salesOrders) {
          const orderData = order as Record<string, unknown>;
          await tx.salesOrder.upsert({
            where: { id: orderData.id as string },
            update: orderData as never,
            create: orderData as never,
          });
        }
        restoredCounts.salesOrders = data.salesOrders.length;
      }

      // 4. Restore invoices
      if (data.invoices && Array.isArray(data.invoices)) {
        for (const invoice of data.invoices) {
          const invoiceData = invoice as Record<string, unknown>;
          await tx.invoice.upsert({
            where: { id: invoiceData.id as string },
            update: invoiceData as never,
            create: invoiceData as never,
          });
        }
        restoredCounts.invoices = data.invoices.length;
      }

      // 5. Restore purchase orders
      if (data.purchaseOrders && Array.isArray(data.purchaseOrders)) {
        for (const po of data.purchaseOrders) {
          const poData = po as Record<string, unknown>;
          await tx.purchaseOrder.upsert({
            where: { id: poData.id as string },
            update: poData as never,
            create: poData as never,
          });
        }
        restoredCounts.purchaseOrders = data.purchaseOrders.length;
      }
    });

    this.logger.log(`Backup restored: ${filename}`, restoredCounts);

    return {
      message: `Backup ${filename} restored successfully`,
      restoredCounts,
    };
  }

  /**
   * Delete a backup file.
   */
  async deleteBackup(organizationId: string, filename: string): Promise<void> {
    const backupPath = this.getBackupPath();
    const filePath = path.join(backupPath, filename);

    if (!filename.startsWith(`backup-${organizationId}-`)) {
      throw new BadRequestException('Backup file does not belong to this organization');
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Backup file not found: ${filename}`);
    }

    fs.unlinkSync(filePath);
    this.logger.log(`Backup deleted: ${filename}`);
  }

  /**
   * Export all organization data into a structured object.
   */
  private async exportOrganizationData(organizationId: string) {
    const [
      organization,
      items,
      contacts,
      salesOrders,
      invoices,
      purchaseOrders,
      categories,
      warehouses,
      taxRates,
      paymentTerms,
      priceLists,
    ] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: organizationId } }),
      this.prisma.item.findMany({ where: { organizationId } }),
      this.prisma.contact.findMany({ where: { organizationId } }),
      this.prisma.salesOrder.findMany({
        where: { organizationId },
        include: { items: true },
      }),
      this.prisma.invoice.findMany({
        where: { organizationId },
        include: { items: true },
      }),
      this.prisma.purchaseOrder.findMany({
        where: { organizationId },
        include: { items: true },
      }),
      this.prisma.category.findMany({ where: { organizationId } }),
      this.prisma.warehouse.findMany({ where: { organizationId } }),
      this.prisma.taxRate.findMany({ where: { organizationId } }),
      this.prisma.paymentTerm.findMany({ where: { organizationId } }),
      this.prisma.priceList.findMany({ where: { organizationId } }),
    ]);

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      organizationId,
      organization,
      items,
      contacts,
      salesOrders,
      invoices,
      purchaseOrders,
      categories,
      warehouses,
      taxRates,
      paymentTerms,
      priceLists,
    };
  }
}
