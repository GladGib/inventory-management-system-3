import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UpdateReorderSettingsDto } from './dto/update-reorder-settings.dto';
import { BulkReorderSettingsDto } from './dto/bulk-reorder-settings.dto';

@Injectable()
export class ReorderService {
  constructor(private readonly prisma: PrismaService) {}

  // ============ Reorder Settings ============

  async getReorderSettings(itemId: string, organizationId: string) {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, organizationId },
      select: { id: true, sku: true, name: true, reorderLevel: true, reorderQty: true },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    const settings = await this.prisma.itemReorderSettings.findMany({
      where: { itemId, organizationId },
    });

    return {
      item,
      settings,
    };
  }

  async updateReorderSettings(
    itemId: string,
    organizationId: string,
    dto: UpdateReorderSettingsDto,
  ) {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, organizationId },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // Upsert settings
    const existing = await this.prisma.itemReorderSettings.findFirst({
      where: {
        itemId,
        warehouseId: dto.warehouseId || null,
        organizationId,
      },
    });

    if (existing) {
      return this.prisma.itemReorderSettings.update({
        where: { id: existing.id },
        data: {
          ...(dto.reorderLevel !== undefined && { reorderLevel: dto.reorderLevel }),
          ...(dto.reorderQuantity !== undefined && { reorderQuantity: dto.reorderQuantity }),
          ...(dto.safetyStock !== undefined && { safetyStock: dto.safetyStock }),
          ...(dto.leadTimeDays !== undefined && { leadTimeDays: dto.leadTimeDays }),
          ...(dto.preferredVendorId !== undefined && { preferredVendorId: dto.preferredVendorId }),
          ...(dto.autoReorder !== undefined && { autoReorder: dto.autoReorder }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    }

    return this.prisma.itemReorderSettings.create({
      data: {
        itemId,
        warehouseId: dto.warehouseId || null,
        reorderLevel: dto.reorderLevel ?? 0,
        reorderQuantity: dto.reorderQuantity ?? 0,
        safetyStock: dto.safetyStock ?? 0,
        leadTimeDays: dto.leadTimeDays ?? 0,
        preferredVendorId: dto.preferredVendorId,
        autoReorder: dto.autoReorder ?? false,
        isActive: dto.isActive ?? true,
        organizationId,
      },
    });
  }

  async bulkUpdateReorderSettings(organizationId: string, dto: BulkReorderSettingsDto) {
    const results = [];

    for (const itemSetting of dto.items) {
      const result = await this.updateReorderSettings(itemSetting.itemId, organizationId, {
        warehouseId: itemSetting.warehouseId,
        reorderLevel: itemSetting.reorderLevel,
        reorderQuantity: itemSetting.reorderQuantity,
        safetyStock: itemSetting.safetyStock,
        leadTimeDays: itemSetting.leadTimeDays,
        preferredVendorId: itemSetting.preferredVendorId,
        autoReorder: itemSetting.autoReorder,
        isActive: itemSetting.isActive,
      });
      results.push(result);
    }

    return { updated: results.length, results };
  }

  // ============ Reorder Suggestions ============

  async getReorderSuggestions(organizationId: string) {
    // Get all items with their reorder settings and current stock
    const items = await this.prisma.item.findMany({
      where: {
        organizationId,
        trackInventory: true,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        sku: true,
        name: true,
        reorderLevel: true,
        reorderQty: true,
        costPrice: true,
        unit: true,
        stockLevels: {
          select: {
            warehouseId: true,
            stockOnHand: true,
            committedStock: true,
            warehouse: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    const suggestions = [];

    for (const item of items) {
      // Check per-item reorder settings first
      const reorderSettings = await this.prisma.itemReorderSettings.findMany({
        where: { itemId: item.id, organizationId, isActive: true },
      });

      // Calculate total stock
      const totalStock = item.stockLevels.reduce(
        (sum, sl) => sum + Number(sl.stockOnHand),
        0,
      );
      const totalCommitted = item.stockLevels.reduce(
        (sum, sl) => sum + Number(sl.committedStock),
        0,
      );
      const availableStock = totalStock - totalCommitted;

      // Use custom settings if they exist, otherwise fall back to item-level
      const reorderLevel = reorderSettings.length > 0
        ? Number(reorderSettings[0].reorderLevel)
        : Number(item.reorderLevel);

      const reorderQty = reorderSettings.length > 0
        ? Number(reorderSettings[0].reorderQuantity)
        : Number(item.reorderQty);

      const preferredVendorId = reorderSettings.length > 0
        ? reorderSettings[0].preferredVendorId
        : null;

      if (reorderLevel > 0 && availableStock <= reorderLevel) {
        // Get preferred vendor info
        let preferredVendor = null;
        if (preferredVendorId) {
          preferredVendor = await this.prisma.contact.findUnique({
            where: { id: preferredVendorId },
            select: { id: true, displayName: true, companyName: true },
          });
        }

        suggestions.push({
          itemId: item.id,
          sku: item.sku,
          name: item.name,
          unit: item.unit,
          currentStock: totalStock,
          availableStock,
          reorderLevel,
          suggestedQty: reorderQty > 0 ? reorderQty : reorderLevel * 2,
          costPrice: Number(item.costPrice),
          estimatedCost: Number(item.costPrice) * (reorderQty > 0 ? reorderQty : reorderLevel * 2),
          preferredVendor,
          stockLevels: item.stockLevels.map((sl) => ({
            warehouseId: sl.warehouseId,
            warehouse: sl.warehouse,
            stockOnHand: Number(sl.stockOnHand),
            committedStock: Number(sl.committedStock),
          })),
        });
      }
    }

    return suggestions;
  }

  // ============ Reorder Alert Management ============

  async checkReorderPoints(organizationId: string) {
    const suggestions = await this.getReorderSuggestions(organizationId);
    const newAlerts = [];

    for (const suggestion of suggestions) {
      // Check if there's already a pending/acknowledged alert for this item
      const existingAlert = await this.prisma.reorderAlert.findFirst({
        where: {
          itemId: suggestion.itemId,
          organizationId,
          status: { in: ['PENDING', 'ACKNOWLEDGED'] },
        },
      });

      if (!existingAlert) {
        // Determine warehouse (use first one with low stock, or empty string)
        const lowStockWarehouse = suggestion.stockLevels.find(
          (sl) => sl.stockOnHand <= suggestion.reorderLevel,
        );

        const alert = await this.prisma.reorderAlert.create({
          data: {
            itemId: suggestion.itemId,
            warehouseId: lowStockWarehouse?.warehouseId || suggestion.stockLevels[0]?.warehouseId || '',
            currentStock: suggestion.currentStock,
            reorderLevel: suggestion.reorderLevel,
            suggestedQty: suggestion.suggestedQty,
            status: 'PENDING',
            organizationId,
            notifiedAt: new Date(),
          },
        });
        newAlerts.push(alert);
      }
    }

    return {
      checked: suggestions.length,
      newAlerts: newAlerts.length,
      alerts: newAlerts,
    };
  }

  async createAutoReorderPO(
    alertId: string,
    organizationId: string,
    userId: string,
    overrides?: { vendorId?: string; warehouseId?: string },
  ) {
    const alert = await this.prisma.reorderAlert.findFirst({
      where: { id: alertId, organizationId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (alert.status === 'RESOLVED' || alert.status === 'PO_CREATED') {
      throw new BadRequestException('Alert is already resolved or has a PO');
    }

    // Get item details
    const item = await this.prisma.item.findUnique({
      where: { id: alert.itemId },
      select: { id: true, sku: true, name: true, unit: true, costPrice: true },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // Get reorder settings for preferred vendor
    const settings = await this.prisma.itemReorderSettings.findFirst({
      where: { itemId: alert.itemId, organizationId, isActive: true },
    });

    const vendorId = overrides?.vendorId || settings?.preferredVendorId;
    if (!vendorId) {
      throw new BadRequestException(
        'No vendor specified. Set a preferred vendor in reorder settings or provide one.',
      );
    }

    // Validate vendor
    const vendor = await this.prisma.contact.findFirst({
      where: { id: vendorId, organizationId, type: { in: ['VENDOR', 'BOTH'] } },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Generate PO number
    const lastPO = await this.prisma.purchaseOrder.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { orderNumber: true },
    });
    const nextNum = lastPO
      ? parseInt(lastPO.orderNumber.split('-')[1]) + 1
      : 1;
    const orderNumber = `PO-${String(nextNum).padStart(6, '0')}`;

    const quantity = Number(alert.suggestedQty);
    const unitPrice = Number(item.costPrice);
    const lineTotal = quantity * unitPrice;

    return this.prisma.$transaction(async (tx) => {
      // Create draft PO
      const po = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          organizationId,
          vendorId,
          warehouseId: overrides?.warehouseId || alert.warehouseId,
          orderDate: new Date(),
          status: 'DRAFT',
          subtotal: lineTotal,
          total: lineTotal,
          notes: `Auto-generated from reorder alert for ${item.sku}`,
          createdById: userId,
          items: {
            create: {
              itemId: item.id,
              quantity,
              unit: item.unit,
              unitPrice,
              total: lineTotal,
              description: item.name,
            },
          },
        },
        include: {
          vendor: { select: { id: true, displayName: true } },
          items: {
            include: {
              item: { select: { sku: true, name: true } },
            },
          },
        },
      });

      // Update alert status
      await tx.reorderAlert.update({
        where: { id: alertId },
        data: {
          status: 'PO_CREATED',
          purchaseOrderId: po.id,
        },
      });

      return po;
    });
  }

  async bulkCreatePOs(
    alertIds: string[],
    organizationId: string,
    userId: string,
  ) {
    const results = [];
    const errors = [];

    for (const alertId of alertIds) {
      try {
        const po = await this.createAutoReorderPO(alertId, organizationId, userId);
        results.push({ alertId, purchaseOrderId: po.id, success: true });
      } catch (error) {
        errors.push({
          alertId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { created: results.length, failed: errors.length, results, errors };
  }

  async getAlerts(
    organizationId: string,
    filters?: {
      status?: string;
      itemId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { status, itemId, page = 1, limit = 25 } = filters || {};

    const where: any = {
      organizationId,
      ...(status && { status }),
      ...(itemId && { itemId }),
    };

    const [alerts, total] = await Promise.all([
      this.prisma.reorderAlert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.reorderAlert.count({ where }),
    ]);

    // Enrich with item data
    const enrichedAlerts = await Promise.all(
      alerts.map(async (alert) => {
        const item = await this.prisma.item.findUnique({
          where: { id: alert.itemId },
          select: { id: true, sku: true, name: true, unit: true },
        });
        const warehouse = alert.warehouseId
          ? await this.prisma.warehouse.findUnique({
              where: { id: alert.warehouseId },
              select: { id: true, name: true, code: true },
            })
          : null;
        return {
          ...alert,
          currentStock: Number(alert.currentStock),
          reorderLevel: Number(alert.reorderLevel),
          suggestedQty: Number(alert.suggestedQty),
          item,
          warehouse,
        };
      }),
    );

    return {
      data: enrichedAlerts,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async acknowledgeAlert(alertId: string, organizationId: string) {
    const alert = await this.prisma.reorderAlert.findFirst({
      where: { id: alertId, organizationId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (alert.status !== 'PENDING') {
      throw new BadRequestException('Only pending alerts can be acknowledged');
    }

    return this.prisma.reorderAlert.update({
      where: { id: alertId },
      data: { status: 'ACKNOWLEDGED' },
    });
  }

  async resolveAlert(alertId: string, organizationId: string) {
    const alert = await this.prisma.reorderAlert.findFirst({
      where: { id: alertId, organizationId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    return this.prisma.reorderAlert.update({
      where: { id: alertId },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
  }

  // ============ Demand Forecasting ============

  async forecastDemand(
    itemId: string,
    organizationId: string,
    periods: number = 3,
  ) {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, organizationId },
      select: { id: true, sku: true, name: true },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // Get historical sales data (last 12 months of invoice items)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const salesData = await this.prisma.invoiceItem.findMany({
      where: {
        itemId,
        invoice: {
          organizationId,
          invoiceDate: { gte: twelveMonthsAgo },
          status: { notIn: ['VOID', 'DRAFT'] },
        },
      },
      include: {
        invoice: { select: { invoiceDate: true } },
      },
      orderBy: { invoice: { invoiceDate: 'asc' } },
    });

    // Group by month
    const monthlyData = new Map<string, number>();
    for (const sale of salesData) {
      const monthKey = `${sale.invoice.invoiceDate.getFullYear()}-${String(sale.invoice.invoiceDate.getMonth() + 1).padStart(2, '0')}`;
      const current = monthlyData.get(monthKey) || 0;
      monthlyData.set(monthKey, current + Number(sale.quantity));
    }

    const historicalMonths = Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, qty]) => ({ period, quantity: qty }));

    // Simple moving average forecast
    const windowSize = Math.min(3, historicalMonths.length);
    const forecasts = [];

    if (historicalMonths.length >= 2) {
      const recentData = historicalMonths.slice(-windowSize);
      const avgDemand =
        recentData.reduce((sum, d) => sum + d.quantity, 0) / windowSize;

      const now = new Date();
      for (let i = 1; i <= periods; i++) {
        const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const forecastPeriod = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;

        forecasts.push({
          period: forecastPeriod,
          forecastQty: Math.round(avgDemand * 100) / 100,
          method: 'MOVING_AVERAGE',
          confidence: Math.min(0.95, 0.5 + historicalMonths.length * 0.05),
        });
      }
    }

    return {
      item,
      historicalData: historicalMonths,
      forecasts,
      method: 'MOVING_AVERAGE',
      windowSize,
    };
  }

  // ============ Reorder Report ============

  async getReorderReport(organizationId: string) {
    // Items below reorder point
    const suggestions = await this.getReorderSuggestions(organizationId);

    // Pending alerts
    const pendingAlerts = await this.prisma.reorderAlert.count({
      where: { organizationId, status: 'PENDING' },
    });

    const acknowledgedAlerts = await this.prisma.reorderAlert.count({
      where: { organizationId, status: 'ACKNOWLEDGED' },
    });

    const poCreatedAlerts = await this.prisma.reorderAlert.count({
      where: { organizationId, status: 'PO_CREATED' },
    });

    // Auto-reorder active count
    const autoReorderCount = await this.prisma.itemReorderSettings.count({
      where: { organizationId, autoReorder: true, isActive: true },
    });

    // Stock coverage days (how many days current stock can last based on avg daily demand)
    const coverageItems = [];
    for (const suggestion of suggestions.slice(0, 20)) {
      // Get last 30 days sales
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentSales = await this.prisma.invoiceItem.aggregate({
        where: {
          itemId: suggestion.itemId,
          invoice: {
            organizationId,
            invoiceDate: { gte: thirtyDaysAgo },
            status: { notIn: ['VOID', 'DRAFT'] },
          },
        },
        _sum: { quantity: true },
      });

      const totalSold = Number(recentSales._sum.quantity || 0);
      const avgDailyDemand = totalSold / 30;
      const coverageDays = avgDailyDemand > 0
        ? Math.round(suggestion.currentStock / avgDailyDemand)
        : suggestion.currentStock > 0 ? 999 : 0;

      coverageItems.push({
        itemId: suggestion.itemId,
        sku: suggestion.sku,
        name: suggestion.name,
        currentStock: suggestion.currentStock,
        reorderLevel: suggestion.reorderLevel,
        avgDailyDemand: Math.round(avgDailyDemand * 100) / 100,
        coverageDays,
      });
    }

    return {
      summary: {
        itemsBelowReorder: suggestions.length,
        pendingAlerts,
        acknowledgedAlerts,
        poCreatedAlerts,
        autoReorderActive: autoReorderCount,
      },
      itemsBelowReorder: suggestions,
      stockCoverage: coverageItems,
    };
  }
}
