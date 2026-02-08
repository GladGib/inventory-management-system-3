import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CacheService } from '@/modules/cache/cache.service';
import { ExcelExportService, ReportData } from './services/excel-export.service';
import { PdfExportService } from './services/pdf-export.service';

interface DateRange {
  fromDate: Date;
  toDate: Date;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

interface StockAgingFilters {
  warehouseId?: string;
  categoryId?: string;
  asOfDate?: Date;
  buckets?: number[];
  slowMovingThreshold?: number;
}

export interface AgeBucket {
  label: string;
  minDays: number;
  maxDays: number;
  itemCount: number;
  quantity: number;
  value: number;
  percentOfValue: number;
}

export interface StockAgingItem {
  itemId: string;
  sku: string;
  itemName: string;
  category: string;
  warehouse: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  lastReceiveDate: Date | null;
  lastSaleDate: Date | null;
  ageDays: number;
  ageBucket: string;
  daysSinceLastSale: number | null;
  isSlowMoving: boolean;
  turnoverRate: number;
}

/** Default TTL for report caches: 300 seconds (5 minutes) */
const REPORT_CACHE_TTL = 300;

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly excelExportService: ExcelExportService,
    private readonly pdfExportService: PdfExportService,
  ) {}

  // ============ Stock Aging Report ============

  async getStockAgingReport(
    organizationId: string,
    filters: StockAgingFilters = {}
  ) {
    const filterKey = JSON.stringify({
      w: filters.warehouseId,
      c: filters.categoryId,
      b: filters.buckets,
      s: filters.slowMovingThreshold,
    });
    const cacheKey = this.cacheService.buildKey('reports', 'stock-aging', organizationId, filterKey);
    return this.cacheService.wrap(cacheKey, () => this.fetchStockAgingReport(organizationId, filters), REPORT_CACHE_TTL);
  }

  private async fetchStockAgingReport(
    organizationId: string,
    filters: StockAgingFilters = {}
  ) {
    const {
      warehouseId,
      categoryId,
      asOfDate = new Date(),
      buckets = [30, 60, 90, 180],
      slowMovingThreshold = 90,
    } = filters;

    // Build where clause for items
    const itemWhere: any = {
      organizationId,
      status: 'ACTIVE',
      trackInventory: true,
    };

    if (categoryId) {
      itemWhere.categoryId = categoryId;
    }

    // Get all inventory items with stock levels
    const items = await this.prisma.item.findMany({
      where: itemWhere,
      include: {
        category: { select: { name: true } },
        stockLevels: warehouseId
          ? { where: { warehouseId }, include: { warehouse: true } }
          : { include: { warehouse: true } },
        purchaseReceiveItems: {
          orderBy: { purchaseReceive: { receiveDate: 'desc' } },
          take: 1,
          include: {
            purchaseReceive: { select: { receiveDate: true } },
          },
        },
        invoiceItems: {
          orderBy: { invoice: { invoiceDate: 'desc' } },
          take: 1,
          include: {
            invoice: { select: { invoiceDate: true } },
          },
        },
      },
    });

    // Calculate aging for each item
    const agingItems: StockAgingItem[] = [];
    const ageBucketCounts: Map<string, { count: number; quantity: number; value: number }> = new Map();

    // Initialize buckets
    const bucketLabels = this.generateBucketLabels(buckets);
    bucketLabels.forEach((label) => {
      ageBucketCounts.set(label, { count: 0, quantity: 0, value: 0 });
    });

    let totalValue = 0;
    let totalQuantity = 0;
    let slowMovingCount = 0;
    let slowMovingValue = 0;
    let totalAgeDays = 0;
    let itemCount = 0;

    for (const item of items) {
      // Calculate total stock
      const stockOnHand = item.stockLevels.reduce(
        (sum, sl) => sum + Number(sl.stockOnHand),
        0
      );

      if (stockOnHand <= 0) continue;

      const unitCost = Number(item.costPrice);
      const itemValue = stockOnHand * unitCost;

      // Get warehouse name(s)
      const warehouseName = item.stockLevels.length > 0
        ? item.stockLevels.map((sl) => sl.warehouse.name).join(', ')
        : 'N/A';

      // Get last receive date
      const lastReceiveDate = item.purchaseReceiveItems.length > 0
        ? item.purchaseReceiveItems[0].purchaseReceive.receiveDate
        : null;

      // Get last sale date
      const lastSaleDate = item.invoiceItems.length > 0
        ? item.invoiceItems[0].invoice.invoiceDate
        : null;

      // Calculate age (from last receive date or item creation date)
      const ageReferenceDate = lastReceiveDate || item.createdAt;
      const ageDays = Math.floor(
        (asOfDate.getTime() - ageReferenceDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determine age bucket
      const ageBucket = this.getAgeBucket(ageDays, buckets);

      // Calculate days since last sale
      const daysSinceLastSale = lastSaleDate
        ? Math.floor((asOfDate.getTime() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Determine if slow moving
      const isSlowMoving = daysSinceLastSale === null
        ? ageDays > slowMovingThreshold
        : daysSinceLastSale > slowMovingThreshold;

      // Calculate turnover rate (simplified: sales qty / avg stock over 365 days)
      // For now, use a simplified calculation
      const turnoverRate = 0; // Would need historical data for accurate calculation

      const agingItem: StockAgingItem = {
        itemId: item.id,
        sku: item.sku,
        itemName: item.name,
        category: item.category?.name || 'Uncategorized',
        warehouse: warehouseName,
        quantity: stockOnHand,
        unitCost,
        totalValue: itemValue,
        lastReceiveDate,
        lastSaleDate,
        ageDays,
        ageBucket,
        daysSinceLastSale,
        isSlowMoving,
        turnoverRate,
      };

      agingItems.push(agingItem);

      // Update bucket counts
      const bucketData = ageBucketCounts.get(ageBucket);
      if (bucketData) {
        bucketData.count++;
        bucketData.quantity += stockOnHand;
        bucketData.value += itemValue;
      }

      // Update totals
      totalValue += itemValue;
      totalQuantity += stockOnHand;
      totalAgeDays += ageDays;
      itemCount++;

      if (isSlowMoving) {
        slowMovingCount++;
        slowMovingValue += itemValue;
      }
    }

    // Build bucket response with percentages
    const ageBuckets: AgeBucket[] = [];
    let minDays = 0;
    for (let i = 0; i < bucketLabels.length; i++) {
      const label = bucketLabels[i];
      const data = ageBucketCounts.get(label)!;
      const maxDays = i < buckets.length ? buckets[i] : Infinity;

      ageBuckets.push({
        label,
        minDays,
        maxDays: maxDays === Infinity ? 999999 : maxDays,
        itemCount: data.count,
        quantity: data.quantity,
        value: Math.round(data.value * 100) / 100,
        percentOfValue: totalValue > 0 ? Math.round((data.value / totalValue) * 10000) / 100 : 0,
      });

      minDays = maxDays + 1;
    }

    return {
      summary: {
        totalItems: itemCount,
        totalQuantity: Math.round(totalQuantity * 100) / 100,
        totalValue: Math.round(totalValue * 100) / 100,
        avgAge: itemCount > 0 ? Math.round(totalAgeDays / itemCount) : 0,
        slowMovingCount,
        slowMovingValue: Math.round(slowMovingValue * 100) / 100,
      },
      buckets: ageBuckets,
      items: agingItems.sort((a, b) => b.ageDays - a.ageDays),
      asOfDate: asOfDate.toISOString(),
      filters: {
        warehouseId,
        categoryId,
        slowMovingThreshold,
      },
    };
  }

  private generateBucketLabels(buckets: number[]): string[] {
    const labels: string[] = [];
    let prevBucket = 0;

    for (const bucket of buckets) {
      labels.push(`${prevBucket}-${bucket} days`);
      prevBucket = bucket + 1;
    }

    labels.push(`${prevBucket}+ days`);
    return labels;
  }

  private getAgeBucket(ageDays: number, buckets: number[]): string {
    let prevBucket = 0;

    for (const bucket of buckets) {
      if (ageDays <= bucket) {
        return `${prevBucket}-${bucket} days`;
      }
      prevBucket = bucket + 1;
    }

    return `${prevBucket}+ days`;
  }

  // ============ Export Methods ============

  async exportStockAgingToExcel(
    organizationId: string,
    filters: StockAgingFilters = {}
  ): Promise<Buffer> {
    const report = await this.getStockAgingReport(organizationId, filters);

    const reportData: ReportData = {
      title: 'Stock Aging Report',
      columns: [
        { title: 'SKU', dataIndex: 'sku', type: 'string' },
        { title: 'Item Name', dataIndex: 'itemName', type: 'string' },
        { title: 'Category', dataIndex: 'category', type: 'string' },
        { title: 'Warehouse', dataIndex: 'warehouse', type: 'string' },
        { title: 'Quantity', dataIndex: 'quantity', type: 'number' },
        { title: 'Unit Cost', dataIndex: 'unitCost', type: 'currency' },
        { title: 'Total Value', dataIndex: 'totalValue', type: 'currency' },
        { title: 'Age (Days)', dataIndex: 'ageDays', type: 'number' },
        { title: 'Age Bucket', dataIndex: 'ageBucket', type: 'string' },
        { title: 'Last Received', dataIndex: 'lastReceiveDate', type: 'date' },
        { title: 'Last Sold', dataIndex: 'lastSaleDate', type: 'date' },
        { title: 'Days Since Sale', dataIndex: 'daysSinceLastSale', type: 'number' },
        { title: 'Slow Moving', dataIndex: 'isSlowMoving', type: 'string' },
      ],
      rows: report.items.map((item) => ({
        ...item,
        isSlowMoving: item.isSlowMoving ? 'Yes' : 'No',
      })),
      summary: {
        sku: 'TOTAL',
        quantity: report.summary.totalQuantity,
        totalValue: report.summary.totalValue,
      },
      filters: {
        'As of Date': new Date(report.asOfDate).toLocaleDateString('en-MY'),
        ...(filters.warehouseId && { 'Warehouse': filters.warehouseId }),
        ...(filters.categoryId && { 'Category': filters.categoryId }),
      },
      generatedAt: new Date(),
    };

    return this.excelExportService.generateWorkbook(reportData);
  }

  async exportStockAgingToPdf(
    organizationId: string,
    filters: StockAgingFilters = {}
  ): Promise<Buffer> {
    const report = await this.getStockAgingReport(organizationId, filters);
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, phone: true, email: true, address: true },
    });

    const reportData: ReportData = {
      title: 'Stock Aging Report',
      columns: [
        { title: 'SKU', dataIndex: 'sku', type: 'string' },
        { title: 'Item', dataIndex: 'itemName', type: 'string' },
        { title: 'Qty', dataIndex: 'quantity', type: 'number' },
        { title: 'Value', dataIndex: 'totalValue', type: 'currency' },
        { title: 'Age', dataIndex: 'ageDays', type: 'number' },
        { title: 'Bucket', dataIndex: 'ageBucket', type: 'string' },
        { title: 'Slow', dataIndex: 'isSlowMoving', type: 'string' },
      ],
      rows: report.items.slice(0, 100).map((item) => ({
        ...item,
        isSlowMoving: item.isSlowMoving ? 'Yes' : 'No',
      })),
      summary: {
        sku: 'TOTAL',
        quantity: report.summary.totalQuantity,
        totalValue: report.summary.totalValue,
      },
      filters: {
        'As of Date': new Date(report.asOfDate).toLocaleDateString('en-MY'),
      },
      generatedAt: new Date(),
    };

    return this.pdfExportService.generateReportPdf(reportData, {
      name: org?.name || 'Organization',
      phone: org?.phone || undefined,
      email: org?.email || undefined,
    });
  }

  // ============ Sales Reports ============

  async getSalesSummary(organizationId: string, range: DateRange) {
    const cacheKey = this.cacheService.buildKey(
      'reports', 'sales-summary', organizationId,
      range.fromDate.toISOString(), range.toDate.toISOString(),
    );
    return this.cacheService.wrap(cacheKey, () => this.fetchSalesSummary(organizationId, range), REPORT_CACHE_TTL);
  }

  private async fetchSalesSummary(organizationId: string, range: DateRange) {
    const { fromDate, toDate } = range;

    const [orders, invoices, payments] = await Promise.all([
      this.prisma.salesOrder.aggregate({
        where: {
          organizationId,
          orderDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'CANCELLED'] },
        },
        _count: true,
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          organizationId,
          invoiceDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
        _count: true,
        _sum: { total: true, taxAmount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          organizationId,
          paymentDate: { gte: fromDate, lte: toDate },
          status: 'COMPLETED',
        },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    return {
      period: { fromDate, toDate },
      salesOrders: {
        count: orders._count,
        total: Number(orders._sum.total) || 0,
      },
      invoices: {
        count: invoices._count,
        total: Number(invoices._sum.total) || 0,
        taxCollected: Number(invoices._sum.taxAmount) || 0,
      },
      paymentsReceived: {
        count: payments._count,
        total: Number(payments._sum.amount) || 0,
      },
    };
  }

  async getSalesByCustomer(
    organizationId: string,
    range: DateRange,
    options?: PaginationOptions
  ) {
    const { fromDate, toDate } = range;
    const { page = 1, limit = 25 } = options || {};

    const salesByCustomer = await this.prisma.invoice.groupBy({
      by: ['customerId'],
      where: {
        organizationId,
        invoiceDate: { gte: fromDate, lte: toDate },
        status: { notIn: ['DRAFT', 'VOID'] },
      },
      _count: true,
      _sum: { total: true, taxAmount: true },
      orderBy: { _sum: { total: 'desc' } },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get customer details
    const customerIds = salesByCustomer.map((s) => s.customerId);
    const customers = await this.prisma.contact.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, displayName: true, companyName: true },
    });

    const customersMap = new Map(customers.map((c) => [c.id, c]));

    return {
      period: { fromDate, toDate },
      data: salesByCustomer.map((s) => ({
        customer: customersMap.get(s.customerId),
        invoiceCount: s._count,
        totalSales: Number(s._sum.total) || 0,
        totalTax: Number(s._sum.taxAmount) || 0,
      })),
    };
  }

  async getSalesByItem(
    organizationId: string,
    range: DateRange,
    options?: PaginationOptions
  ) {
    const { fromDate, toDate } = range;
    const { page = 1, limit = 25 } = options || {};

    const invoiceItems = await this.prisma.invoiceItem.groupBy({
      by: ['itemId'],
      where: {
        invoice: {
          organizationId,
          invoiceDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
      },
      _sum: { quantity: true, amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get item details
    const itemIds = invoiceItems.map((i) => i.itemId);
    const items = await this.prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, sku: true, name: true, costPrice: true },
    });

    const itemsMap = new Map(items.map((i) => [i.id, i]));

    return {
      period: { fromDate, toDate },
      data: invoiceItems.map((i) => {
        const item: any = itemsMap.get(i.itemId);
        const quantitySold = Number(i._sum.quantity) || 0;
        const revenue = Number(i._sum.amount) || 0;
        const costPrice = Number(item?.costPrice) || 0;
        const profit = revenue - quantitySold * costPrice;

        return {
          item,
          quantitySold,
          revenue,
          estimatedCost: quantitySold * costPrice,
          estimatedProfit: profit,
        };
      }),
    };
  }

  async getReceivablesAging(organizationId: string) {
    const cacheKey = this.cacheService.buildKey('reports', 'receivables-aging', organizationId);
    return this.cacheService.wrap(cacheKey, () => this.fetchReceivablesAging(organizationId), REPORT_CACHE_TTL);
  }

  private async fetchReceivablesAging(organizationId: string) {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
        balance: { gt: 0 },
      },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        dueDate: true,
        total: true,
        balance: true,
        customer: { select: { id: true, displayName: true } },
      },
    });

    const aging = {
      current: { invoices: [] as any[], total: 0 },
      '1-30': { invoices: [] as any[], total: 0 },
      '31-60': { invoices: [] as any[], total: 0 },
      '61-90': { invoices: [] as any[], total: 0 },
      '90+': { invoices: [] as any[], total: 0 },
    };

    for (const inv of invoices) {
      const balance = Number(inv.balance);
      const dueDate = new Date(inv.dueDate);

      if (dueDate >= today) {
        aging.current.invoices.push(inv);
        aging.current.total += balance;
      } else if (dueDate >= thirtyDaysAgo) {
        aging['1-30'].invoices.push(inv);
        aging['1-30'].total += balance;
      } else if (dueDate >= sixtyDaysAgo) {
        aging['31-60'].invoices.push(inv);
        aging['31-60'].total += balance;
      } else if (dueDate >= ninetyDaysAgo) {
        aging['61-90'].invoices.push(inv);
        aging['61-90'].total += balance;
      } else {
        aging['90+'].invoices.push(inv);
        aging['90+'].total += balance;
      }
    }

    const totalOutstanding = Object.values(aging).reduce((sum, a) => sum + a.total, 0);

    return {
      asOf: today,
      totalOutstanding,
      aging: Object.entries(aging).map(([bucket, data]) => ({
        bucket,
        count: data.invoices.length,
        total: data.total,
        invoices: data.invoices.slice(0, 5), // First 5 per bucket
      })),
    };
  }

  // ============ Inventory Reports ============

  async getInventorySummary(organizationId: string) {
    const cacheKey = this.cacheService.buildKey('reports', 'inventory-summary', organizationId);
    return this.cacheService.wrap(cacheKey, () => this.fetchInventorySummary(organizationId), REPORT_CACHE_TTL);
  }

  private async fetchInventorySummary(organizationId: string) {
    const [itemCount, stockLevels, lowStock] = await Promise.all([
      this.prisma.item.count({
        where: { organizationId, status: 'ACTIVE', trackInventory: true },
      }),
      this.prisma.stockLevel.aggregate({
        where: {
          item: { organizationId, status: 'ACTIVE' },
        },
        _sum: { stockOnHand: true, committedStock: true },
      }),
      this.prisma.item.findMany({
        where: {
          organizationId,
          status: 'ACTIVE',
          trackInventory: true,
        },
        include: {
          stockLevels: true,
        },
      }),
    ]);

    // Calculate low stock items
    const lowStockItems = lowStock.filter((item) => {
      const totalStock = item.stockLevels.reduce(
        (sum, sl) => sum + Number(sl.stockOnHand),
        0
      );
      return totalStock <= Number(item.reorderLevel);
    });

    // Calculate inventory value
    const inventoryValue = lowStock.reduce((sum, item) => {
      const totalStock = item.stockLevels.reduce(
        (s, sl) => s + Number(sl.stockOnHand),
        0
      );
      return sum + totalStock * Number(item.costPrice);
    }, 0);

    return {
      totalItems: itemCount,
      totalStockOnHand: Number(stockLevels._sum.stockOnHand) || 0,
      totalCommittedStock: Number(stockLevels._sum.committedStock) || 0,
      estimatedInventoryValue: Math.round(inventoryValue * 100) / 100,
      lowStockItemsCount: lowStockItems.length,
      lowStockItems: lowStockItems.slice(0, 10).map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        reorderLevel: Number(item.reorderLevel),
        currentStock: item.stockLevels.reduce(
          (sum, sl) => sum + Number(sl.stockOnHand),
          0
        ),
      })),
    };
  }

  async getInventoryValuation(
    organizationId: string,
    warehouseId?: string,
    options?: PaginationOptions
  ) {
    const { page = 1, limit = 50 } = options || {};
    const cacheKey = this.cacheService.buildKey(
      'reports', 'inventory-valuation', organizationId,
      warehouseId || 'all', String(page), String(limit),
    );
    return this.cacheService.wrap(cacheKey, () => this.fetchInventoryValuation(organizationId, warehouseId, { page, limit }), REPORT_CACHE_TTL);
  }

  private async fetchInventoryValuation(
    organizationId: string,
    warehouseId?: string,
    options?: PaginationOptions
  ) {
    const { page = 1, limit = 50 } = options || {};

    const where: any = {
      organizationId,
      status: 'ACTIVE',
      trackInventory: true,
    };

    const items = await this.prisma.item.findMany({
      where,
      include: {
        stockLevels: warehouseId
          ? { where: { warehouseId } }
          : true,
        category: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const valuation = items.map((item) => {
      const stockOnHand = item.stockLevels.reduce(
        (sum, sl) => sum + Number(sl.stockOnHand),
        0
      );
      const costValue = stockOnHand * Number(item.costPrice);
      const sellingValue = stockOnHand * Number(item.sellingPrice);

      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category?.name,
        stockOnHand,
        costPrice: Number(item.costPrice),
        sellingPrice: Number(item.sellingPrice),
        costValue: Math.round(costValue * 100) / 100,
        sellingValue: Math.round(sellingValue * 100) / 100,
        potentialProfit: Math.round((sellingValue - costValue) * 100) / 100,
      };
    });

    const totals = valuation.reduce(
      (acc, v) => ({
        totalCostValue: acc.totalCostValue + v.costValue,
        totalSellingValue: acc.totalSellingValue + v.sellingValue,
        totalPotentialProfit: acc.totalPotentialProfit + v.potentialProfit,
      }),
      { totalCostValue: 0, totalSellingValue: 0, totalPotentialProfit: 0 }
    );

    return {
      warehouseId: warehouseId || 'all',
      items: valuation,
      totals,
    };
  }

  async getStockMovement(
    organizationId: string,
    itemId: string,
    range: DateRange
  ) {
    const { fromDate, toDate } = range;

    const item = await this.prisma.item.findFirst({
      where: { id: itemId, organizationId },
      include: { stockLevels: { include: { warehouse: true } } },
    });

    if (!item) {
      return null;
    }

    // Get sales (stock out)
    const salesItems = await this.prisma.invoiceItem.findMany({
      where: {
        itemId,
        invoice: {
          organizationId,
          invoiceDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
      },
      include: {
        invoice: { select: { invoiceNumber: true, invoiceDate: true } },
      },
    });

    // Get purchases (stock in)
    const purchaseReceiveItems = await this.prisma.purchaseReceiveItem.findMany({
      where: {
        itemId,
        purchaseReceive: {
          organizationId,
          receiveDate: { gte: fromDate, lte: toDate },
          status: 'RECEIVED',
        },
      },
      include: {
        purchaseReceive: { select: { receiveNumber: true, receiveDate: true } },
      },
    });

    const movements = [
      ...salesItems.map((si) => ({
        date: si.invoice.invoiceDate,
        type: 'SALE' as const,
        reference: si.invoice.invoiceNumber,
        quantity: -Number(si.quantity),
      })),
      ...purchaseReceiveItems.map((pri) => ({
        date: pri.purchaseReceive.receiveDate,
        type: 'PURCHASE' as const,
        reference: pri.purchaseReceive.receiveNumber,
        quantity: Number(pri.acceptedQty),
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    const totalIn = movements
      .filter((m) => m.quantity > 0)
      .reduce((sum, m) => sum + m.quantity, 0);
    const totalOut = movements
      .filter((m) => m.quantity < 0)
      .reduce((sum, m) => sum + Math.abs(m.quantity), 0);

    return {
      item: { id: item.id, sku: item.sku, name: item.name },
      period: { fromDate, toDate },
      currentStock: item.stockLevels.reduce(
        (sum, sl) => sum + Number(sl.stockOnHand),
        0
      ),
      summary: { totalIn, totalOut, netChange: totalIn - totalOut },
      movements,
    };
  }

  // ============ Purchase Reports ============

  async getPurchasesSummary(organizationId: string, range: DateRange) {
    const cacheKey = this.cacheService.buildKey(
      'reports', 'purchases-summary', organizationId,
      range.fromDate.toISOString(), range.toDate.toISOString(),
    );
    return this.cacheService.wrap(cacheKey, () => this.fetchPurchasesSummary(organizationId, range), REPORT_CACHE_TTL);
  }

  private async fetchPurchasesSummary(organizationId: string, range: DateRange) {
    const { fromDate, toDate } = range;

    const [orders, receives, bills, payments] = await Promise.all([
      this.prisma.purchaseOrder.aggregate({
        where: {
          organizationId,
          orderDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'CANCELLED'] },
        },
        _count: true,
        _sum: { total: true },
      }),
      this.prisma.purchaseReceive.aggregate({
        where: {
          organizationId,
          receiveDate: { gte: fromDate, lte: toDate },
          status: 'RECEIVED',
        },
        _count: true,
      }),
      this.prisma.bill.aggregate({
        where: {
          organizationId,
          billDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
        _count: true,
        _sum: { total: true, taxAmount: true },
      }),
      this.prisma.vendorPayment.aggregate({
        where: {
          organizationId,
          paymentDate: { gte: fromDate, lte: toDate },
          status: 'COMPLETED',
        },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    return {
      period: { fromDate, toDate },
      purchaseOrders: {
        count: orders._count,
        total: Number(orders._sum.total) || 0,
      },
      receives: { count: receives._count },
      bills: {
        count: bills._count,
        total: Number(bills._sum.total) || 0,
        taxPaid: Number(bills._sum.taxAmount) || 0,
      },
      paymentsMade: {
        count: payments._count,
        total: Number(payments._sum.amount) || 0,
      },
    };
  }

  async getPurchasesByVendor(
    organizationId: string,
    range: DateRange,
    options?: PaginationOptions
  ) {
    const { fromDate, toDate } = range;
    const { page = 1, limit = 25 } = options || {};

    const purchasesByVendor = await this.prisma.bill.groupBy({
      by: ['vendorId'],
      where: {
        organizationId,
        billDate: { gte: fromDate, lte: toDate },
        status: { notIn: ['DRAFT', 'VOID'] },
      },
      _count: true,
      _sum: { total: true, taxAmount: true },
      orderBy: { _sum: { total: 'desc' } },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get vendor details
    const vendorIds = purchasesByVendor.map((p) => p.vendorId);
    const vendors = await this.prisma.contact.findMany({
      where: { id: { in: vendorIds } },
      select: { id: true, displayName: true, companyName: true },
    });

    const vendorsMap = new Map(vendors.map((v) => [v.id, v]));

    return {
      period: { fromDate, toDate },
      data: purchasesByVendor.map((p) => ({
        vendor: vendorsMap.get(p.vendorId),
        billCount: p._count,
        totalPurchases: Number(p._sum.total) || 0,
        totalTax: Number(p._sum.taxAmount) || 0,
      })),
    };
  }

  // ============ SST Tax Report (SST-03 format) ============

  async getSSTReport(
    organizationId: string,
    range: DateRange,
  ) {
    const { fromDate, toDate } = range;

    // Get organization tax settings
    const taxSettings = await this.prisma.organizationTaxSettings.findUnique({
      where: { organizationId },
    });

    // Get all active tax rates for the organization
    const taxRates = await this.prisma.taxRate.findMany({
      where: { organizationId, isActive: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taxRateMap = new Map<string, any>(taxRates.map((tr: any) => [tr.id, tr]));

    // === OUTPUT TAX (Sales) ===
    // Get all invoice items in the period with their tax info
    const invoiceItems = await this.prisma.invoiceItem.findMany({
      where: {
        invoice: {
          organizationId,
          invoiceDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
      },
      select: {
        quantity: true,
        amount: true,
        taxRateId: true,
        taxAmount: true,
        invoice: {
          select: {
            invoiceNumber: true,
            invoiceDate: true,
            customer: { select: { displayName: true } },
          },
        },
      },
    });

    // Aggregate output tax by rate
    const outputTaxByRate: Record<string, {
      rateName: string;
      rateCode: string;
      ratePercent: number;
      taxType: string;
      taxableSupplies: number;
      taxAmount: number;
      transactionCount: number;
    }> = {};

    let totalTaxableSupplies = 0;
    let totalOutputTax = 0;
    let totalExemptSupplies = 0;
    let totalZeroRatedSupplies = 0;
    let totalOutOfScopeSupplies = 0;

    for (const item of invoiceItems) {
      const amount = Number(item.amount || 0);
      const tax = Number(item.taxAmount || 0);

      if (item.taxRateId) {
        const taxRate = taxRateMap.get(item.taxRateId);
        if (taxRate) {
          const key = taxRate.id;
          if (!outputTaxByRate[key]) {
            outputTaxByRate[key] = {
              rateName: taxRate.name,
              rateCode: taxRate.code,
              ratePercent: Number(taxRate.rate),
              taxType: taxRate.type,
              taxableSupplies: 0,
              taxAmount: 0,
              transactionCount: 0,
            };
          }
          outputTaxByRate[key].taxableSupplies += amount;
          outputTaxByRate[key].taxAmount += tax;
          outputTaxByRate[key].transactionCount += 1;

          // Categorize by tax type
          if (taxRate.type === 'EXEMPT') {
            totalExemptSupplies += amount;
          } else if (taxRate.type === 'ZERO_RATED') {
            totalZeroRatedSupplies += amount;
          } else if (taxRate.type === 'OUT_OF_SCOPE') {
            totalOutOfScopeSupplies += amount;
          } else {
            totalTaxableSupplies += amount;
            totalOutputTax += tax;
          }
        }
      } else {
        // No tax rate assigned - count as out of scope
        totalOutOfScopeSupplies += amount;
      }
    }

    // === INPUT TAX (Purchases) ===
    const billItems = await this.prisma.billItem.findMany({
      where: {
        bill: {
          organizationId,
          billDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
      },
      select: {
        quantity: true,
        total: true,
        taxRateId: true,
        taxAmount: true,
        bill: {
          select: {
            billNumber: true,
            billDate: true,
            vendor: { select: { displayName: true } },
          },
        },
      },
    });

    const inputTaxByRate: Record<string, {
      rateName: string;
      rateCode: string;
      ratePercent: number;
      taxType: string;
      taxableInputs: number;
      taxAmount: number;
      transactionCount: number;
    }> = {};

    let totalTaxableInputs = 0;
    let totalInputTax = 0;

    for (const item of billItems) {
      const amount = Number(item.total || 0);
      const tax = Number(item.taxAmount || 0);

      if (item.taxRateId) {
        const taxRate = taxRateMap.get(item.taxRateId);
        if (taxRate && taxRate.type !== 'EXEMPT' && taxRate.type !== 'ZERO_RATED' && taxRate.type !== 'OUT_OF_SCOPE') {
          const key = taxRate.id;
          if (!inputTaxByRate[key]) {
            inputTaxByRate[key] = {
              rateName: taxRate.name,
              rateCode: taxRate.code,
              ratePercent: Number(taxRate.rate),
              taxType: taxRate.type,
              taxableInputs: 0,
              taxAmount: 0,
              transactionCount: 0,
            };
          }
          inputTaxByRate[key].taxableInputs += amount;
          inputTaxByRate[key].taxAmount += tax;
          inputTaxByRate[key].transactionCount += 1;

          totalTaxableInputs += amount;
          totalInputTax += tax;
        }
      }
    }

    // === SUMMARY ===
    const netTaxPayable = totalOutputTax - totalInputTax;

    // Invoice and bill aggregates for the period
    const [invoiceAgg, billAgg] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          organizationId,
          invoiceDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
        _count: true,
        _sum: { total: true, subtotal: true, taxAmount: true },
      }),
      this.prisma.bill.aggregate({
        where: {
          organizationId,
          billDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
        _count: true,
        _sum: { total: true, subtotal: true, taxAmount: true },
      }),
    ]);

    return {
      period: { fromDate, toDate },
      organizationId,
      sstRegistrationNo: taxSettings?.sstRegistrationNo || null,
      isSstRegistered: taxSettings?.isSstRegistered || false,

      // Section A: Output Tax
      outputTax: {
        taxableSupplies: Math.round(totalTaxableSupplies * 100) / 100,
        exemptSupplies: Math.round(totalExemptSupplies * 100) / 100,
        zeroRatedSupplies: Math.round(totalZeroRatedSupplies * 100) / 100,
        outOfScopeSupplies: Math.round(totalOutOfScopeSupplies * 100) / 100,
        totalOutputTax: Math.round(totalOutputTax * 100) / 100,
        byRate: Object.values(outputTaxByRate).map((r) => ({
          ...r,
          taxableSupplies: Math.round(r.taxableSupplies * 100) / 100,
          taxAmount: Math.round(r.taxAmount * 100) / 100,
        })),
        invoiceCount: invoiceAgg._count,
        totalInvoiced: Math.round(Number(invoiceAgg._sum.total || 0) * 100) / 100,
      },

      // Section B: Input Tax
      inputTax: {
        taxableInputs: Math.round(totalTaxableInputs * 100) / 100,
        totalInputTax: Math.round(totalInputTax * 100) / 100,
        byRate: Object.values(inputTaxByRate).map((r) => ({
          ...r,
          taxableInputs: Math.round(r.taxableInputs * 100) / 100,
          taxAmount: Math.round(r.taxAmount * 100) / 100,
        })),
        billCount: billAgg._count,
        totalBilled: Math.round(Number(billAgg._sum.total || 0) * 100) / 100,
      },

      // Section C: Summary
      summary: {
        totalOutputTax: Math.round(totalOutputTax * 100) / 100,
        totalInputTax: Math.round(totalInputTax * 100) / 100,
        netTaxPayable: Math.round(netTaxPayable * 100) / 100,
        isRefundDue: netTaxPayable < 0,
      },
    };
  }

  // ============ NEW Sales Reports ============

  async salesBySalesperson(organizationId: string, range: DateRange) {
    const { fromDate, toDate } = range;

    const salesOrders = await this.prisma.salesOrder.findMany({
      where: {
        organizationId,
        orderDate: { gte: fromDate, lte: toDate },
        status: { notIn: ['DRAFT', 'CANCELLED'] },
        salesPersonId: { not: null },
      },
      select: {
        salesPersonId: true,
        total: true,
        salesPerson: { select: { id: true, name: true, email: true } },
      },
    });

    const byPerson = new Map<string, { salesperson: any; orderCount: number; totalSales: number }>();
    for (const so of salesOrders) {
      const key = so.salesPersonId!;
      const existing = byPerson.get(key) || {
        salesperson: so.salesPerson,
        orderCount: 0,
        totalSales: 0,
      };
      existing.orderCount += 1;
      existing.totalSales += Number(so.total);
      byPerson.set(key, existing);
    }

    const data = Array.from(byPerson.values()).sort((a, b) => b.totalSales - a.totalSales);
    const grandTotal = data.reduce((sum, d) => sum + d.totalSales, 0);

    return {
      period: { fromDate, toDate },
      data: data.map((d) => ({
        ...d,
        totalSales: Math.round(d.totalSales * 100) / 100,
        percentOfTotal: grandTotal > 0 ? Math.round((d.totalSales / grandTotal) * 10000) / 100 : 0,
      })),
      summary: {
        totalSalespersons: data.length,
        totalSales: Math.round(grandTotal * 100) / 100,
      },
    };
  }

  async salesByCategory(organizationId: string, range: DateRange) {
    const { fromDate, toDate } = range;

    const invoiceItems = await this.prisma.invoiceItem.findMany({
      where: {
        invoice: {
          organizationId,
          invoiceDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
      },
      select: {
        quantity: true,
        amount: true,
        item: {
          select: {
            categoryId: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    const byCategory = new Map<string, { category: string; categoryId: string; quantity: number; revenue: number; itemCount: number }>();
    for (const ii of invoiceItems) {
      const catId = ii.item.categoryId || 'uncategorized';
      const catName = ii.item.category?.name || 'Uncategorized';
      const existing = byCategory.get(catId) || { category: catName, categoryId: catId, quantity: 0, revenue: 0, itemCount: 0 };
      existing.quantity += Number(ii.quantity);
      existing.revenue += Number(ii.amount);
      existing.itemCount += 1;
      byCategory.set(catId, existing);
    }

    const data = Array.from(byCategory.values()).sort((a, b) => b.revenue - a.revenue);
    const grandTotal = data.reduce((sum, d) => sum + d.revenue, 0);

    return {
      period: { fromDate, toDate },
      data: data.map((d) => ({
        ...d,
        revenue: Math.round(d.revenue * 100) / 100,
        percentOfTotal: grandTotal > 0 ? Math.round((d.revenue / grandTotal) * 10000) / 100 : 0,
      })),
      summary: {
        totalCategories: data.length,
        totalRevenue: Math.round(grandTotal * 100) / 100,
      },
    };
  }

  async salesByRegion(organizationId: string, range: DateRange) {
    const { fromDate, toDate } = range;

    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        invoiceDate: { gte: fromDate, lte: toDate },
        status: { notIn: ['DRAFT', 'VOID'] },
      },
      select: {
        total: true,
        customerId: true,
        customer: {
          select: {
            id: true,
            displayName: true,
            shippingAddress: true,
            billingAddress: true,
          },
        },
      },
    });

    const byRegion = new Map<string, { region: string; customerCount: Set<string>; invoiceCount: number; totalSales: number }>();
    for (const inv of invoices) {
      const addr: any = inv.customer.shippingAddress || inv.customer.billingAddress || {};
      const region = addr.state || addr.city || 'Unknown';
      const existing = byRegion.get(region) || { region, customerCount: new Set<string>(), invoiceCount: 0, totalSales: 0 };
      existing.customerCount.add(inv.customerId);
      existing.invoiceCount += 1;
      existing.totalSales += Number(inv.total);
      byRegion.set(region, existing);
    }

    const data = Array.from(byRegion.values())
      .map((d) => ({
        region: d.region,
        customerCount: d.customerCount.size,
        invoiceCount: d.invoiceCount,
        totalSales: Math.round(d.totalSales * 100) / 100,
      }))
      .sort((a, b) => b.totalSales - a.totalSales);

    const grandTotal = data.reduce((sum, d) => sum + d.totalSales, 0);

    return {
      period: { fromDate, toDate },
      data: data.map((d) => ({
        ...d,
        percentOfTotal: grandTotal > 0 ? Math.round((d.totalSales / grandTotal) * 10000) / 100 : 0,
      })),
      summary: {
        totalRegions: data.length,
        totalSales: Math.round(grandTotal * 100) / 100,
      },
    };
  }

  async monthlySalesSummary(organizationId: string, year: number) {
    const months: { month: number; label: string; orderCount: number; invoiceCount: number; revenue: number; taxCollected: number }[] = [];

    for (let m = 0; m < 12; m++) {
      const fromDate = new Date(year, m, 1);
      const toDate = new Date(year, m + 1, 0, 23, 59, 59, 999);

      const [orders, invoices] = await Promise.all([
        this.prisma.salesOrder.aggregate({
          where: {
            organizationId,
            orderDate: { gte: fromDate, lte: toDate },
            status: { notIn: ['DRAFT', 'CANCELLED'] },
          },
          _count: true,
        }),
        this.prisma.invoice.aggregate({
          where: {
            organizationId,
            invoiceDate: { gte: fromDate, lte: toDate },
            status: { notIn: ['DRAFT', 'VOID'] },
          },
          _count: true,
          _sum: { total: true, taxAmount: true },
        }),
      ]);

      months.push({
        month: m + 1,
        label: fromDate.toLocaleString('en-US', { month: 'short' }),
        orderCount: orders._count,
        invoiceCount: invoices._count,
        revenue: Math.round(Number(invoices._sum.total || 0) * 100) / 100,
        taxCollected: Math.round(Number(invoices._sum.taxAmount || 0) * 100) / 100,
      });
    }

    const totalRevenue = months.reduce((sum, m) => sum + m.revenue, 0);

    return {
      year,
      data: months,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders: months.reduce((sum, m) => sum + m.orderCount, 0),
        totalInvoices: months.reduce((sum, m) => sum + m.invoiceCount, 0),
        avgMonthlyRevenue: Math.round((totalRevenue / 12) * 100) / 100,
      },
    };
  }

  async salesGrowthComparison(organizationId: string, range: DateRange) {
    const { fromDate, toDate } = range;
    const periodMs = toDate.getTime() - fromDate.getTime();
    const prevFromDate = new Date(fromDate.getTime() - periodMs);
    const prevToDate = new Date(fromDate.getTime() - 1);

    const [current, previous] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          organizationId,
          invoiceDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
        _count: true,
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          organizationId,
          invoiceDate: { gte: prevFromDate, lte: prevToDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
        _count: true,
        _sum: { total: true },
      }),
    ]);

    const currentTotal = Number(current._sum.total) || 0;
    const previousTotal = Number(previous._sum.total) || 0;
    const growthAmount = currentTotal - previousTotal;
    const growthPercent = previousTotal > 0 ? (growthAmount / previousTotal) * 100 : currentTotal > 0 ? 100 : 0;

    return {
      currentPeriod: { fromDate, toDate, revenue: Math.round(currentTotal * 100) / 100, invoiceCount: current._count },
      previousPeriod: { fromDate: prevFromDate, toDate: prevToDate, revenue: Math.round(previousTotal * 100) / 100, invoiceCount: previous._count },
      growth: {
        amount: Math.round(growthAmount * 100) / 100,
        percent: Math.round(growthPercent * 100) / 100,
      },
    };
  }

  async averageOrderValue(organizationId: string, range: DateRange) {
    const { fromDate, toDate } = range;

    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        invoiceDate: { gte: fromDate, lte: toDate },
        status: { notIn: ['DRAFT', 'VOID'] },
      },
      select: { invoiceDate: true, total: true },
      orderBy: { invoiceDate: 'asc' },
    });

    // Group by month
    const byMonth = new Map<string, { count: number; totalValue: number }>();
    for (const inv of invoices) {
      const key = `${inv.invoiceDate.getFullYear()}-${String(inv.invoiceDate.getMonth() + 1).padStart(2, '0')}`;
      const existing = byMonth.get(key) || { count: 0, totalValue: 0 };
      existing.count += 1;
      existing.totalValue += Number(inv.total);
      byMonth.set(key, existing);
    }

    const data = Array.from(byMonth.entries()).map(([month, val]) => ({
      month,
      invoiceCount: val.count,
      totalValue: Math.round(val.totalValue * 100) / 100,
      averageOrderValue: Math.round((val.totalValue / val.count) * 100) / 100,
    }));

    const overallTotal = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const overallAvg = invoices.length > 0 ? overallTotal / invoices.length : 0;

    return {
      period: { fromDate, toDate },
      data,
      summary: {
        totalInvoices: invoices.length,
        totalRevenue: Math.round(overallTotal * 100) / 100,
        overallAverageOrderValue: Math.round(overallAvg * 100) / 100,
      },
    };
  }

  async customerAcquisition(organizationId: string, range: DateRange) {
    const { fromDate, toDate } = range;

    // Find customers whose first invoice falls within the period
    const customers = await this.prisma.contact.findMany({
      where: {
        organizationId,
        type: { in: ['CUSTOMER', 'BOTH'] },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        displayName: true,
        createdAt: true,
        invoices: {
          orderBy: { invoiceDate: 'asc' },
          take: 1,
          select: { invoiceDate: true, total: true },
        },
      },
    });

    const newCustomers = customers.filter((c) => {
      const firstInvoice = c.invoices[0];
      if (!firstInvoice) return false;
      return firstInvoice.invoiceDate >= fromDate && firstInvoice.invoiceDate <= toDate;
    });

    // Group by month
    const byMonth = new Map<string, { count: number; customers: string[] }>();
    for (const c of newCustomers) {
      const date = c.invoices[0].invoiceDate;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = byMonth.get(key) || { count: 0, customers: [] };
      existing.count += 1;
      existing.customers.push(c.displayName);
      byMonth.set(key, existing);
    }

    const data = Array.from(byMonth.entries())
      .map(([month, val]) => ({ month, newCustomers: val.count, customerNames: val.customers.slice(0, 5) }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      period: { fromDate, toDate },
      data,
      summary: {
        totalNewCustomers: newCustomers.length,
        totalActiveCustomers: customers.filter((c) => c.invoices.length > 0).length,
      },
    };
  }

  async topProducts(organizationId: string, range: DateRange, limit = 20) {
    const { fromDate, toDate } = range;

    const invoiceItems = await this.prisma.invoiceItem.groupBy({
      by: ['itemId'],
      where: {
        invoice: {
          organizationId,
          invoiceDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
      },
      _sum: { quantity: true, amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });

    const itemIds = invoiceItems.map((i) => i.itemId);
    const items = await this.prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, sku: true, name: true, costPrice: true, category: { select: { name: true } } },
    });
    const itemsMap = new Map(items.map((i) => [i.id, i]));

    const data = invoiceItems.map((ii, index) => {
      const item = itemsMap.get(ii.itemId);
      const qty = Number(ii._sum.quantity) || 0;
      const revenue = Number(ii._sum.amount) || 0;
      const cost = qty * Number(item?.costPrice || 0);
      return {
        rank: index + 1,
        item: { id: ii.itemId, sku: item?.sku, name: item?.name, category: item?.category?.name },
        quantitySold: qty,
        revenue: Math.round(revenue * 100) / 100,
        estimatedCost: Math.round(cost * 100) / 100,
        estimatedProfit: Math.round((revenue - cost) * 100) / 100,
      };
    });

    return {
      period: { fromDate, toDate },
      data,
      summary: {
        totalRevenue: Math.round(data.reduce((sum, d) => sum + d.revenue, 0) * 100) / 100,
        totalQuantity: data.reduce((sum, d) => sum + d.quantitySold, 0),
      },
    };
  }

  // ============ NEW Inventory Reports ============

  async inventoryTurnover(organizationId: string, range: DateRange) {
    const { fromDate, toDate } = range;

    // Get COGS per item (invoiced quantity * cost price)
    const invoiceItems = await this.prisma.invoiceItem.findMany({
      where: {
        invoice: {
          organizationId,
          invoiceDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
      },
      select: { itemId: true, quantity: true, item: { select: { costPrice: true } } },
    });

    const cogsByItem = new Map<string, number>();
    for (const ii of invoiceItems) {
      const cogs = Number(ii.quantity) * Number(ii.item.costPrice);
      cogsByItem.set(ii.itemId, (cogsByItem.get(ii.itemId) || 0) + cogs);
    }

    // Get current inventory for these items
    const itemIds = Array.from(cogsByItem.keys());
    const items = await this.prisma.item.findMany({
      where: { id: { in: itemIds }, organizationId },
      select: {
        id: true, sku: true, name: true, costPrice: true,
        category: { select: { name: true } },
        stockLevels: { select: { stockOnHand: true } },
      },
    });

    const data = items.map((item) => {
      const currentStock = item.stockLevels.reduce((sum, sl) => sum + Number(sl.stockOnHand), 0);
      const avgInventory = currentStock * Number(item.costPrice); // simplified: using current as proxy
      const cogs = cogsByItem.get(item.id) || 0;
      const turnoverRate = avgInventory > 0 ? cogs / avgInventory : 0;
      const daysInPeriod = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)));
      const daysOfStock = turnoverRate > 0 ? daysInPeriod / turnoverRate : 999;

      return {
        item: { id: item.id, sku: item.sku, name: item.name, category: item.category?.name },
        cogs: Math.round(cogs * 100) / 100,
        avgInventoryValue: Math.round(avgInventory * 100) / 100,
        currentStock,
        turnoverRate: Math.round(turnoverRate * 100) / 100,
        daysOfStock: Math.round(daysOfStock),
      };
    }).sort((a, b) => b.turnoverRate - a.turnoverRate);

    return {
      period: { fromDate, toDate },
      data,
      summary: {
        totalItems: data.length,
        avgTurnover: data.length > 0 ? Math.round((data.reduce((sum, d) => sum + d.turnoverRate, 0) / data.length) * 100) / 100 : 0,
      },
    };
  }

  async deadStock(organizationId: string, daysSinceLastSale = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastSale);

    const items = await this.prisma.item.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        trackInventory: true,
      },
      include: {
        category: { select: { name: true } },
        stockLevels: { select: { stockOnHand: true } },
        invoiceItems: {
          orderBy: { invoice: { invoiceDate: 'desc' } },
          take: 1,
          include: { invoice: { select: { invoiceDate: true } } },
        },
      },
    });

    const deadItems = items
      .filter((item) => {
        const totalStock = item.stockLevels.reduce((sum, sl) => sum + Number(sl.stockOnHand), 0);
        if (totalStock <= 0) return false;
        const lastSale = item.invoiceItems[0]?.invoice?.invoiceDate;
        return !lastSale || lastSale < cutoffDate;
      })
      .map((item) => {
        const totalStock = item.stockLevels.reduce((sum, sl) => sum + Number(sl.stockOnHand), 0);
        const lastSale = item.invoiceItems[0]?.invoice?.invoiceDate || null;
        const daysSince = lastSale
          ? Math.floor((Date.now() - lastSale.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          item: { id: item.id, sku: item.sku, name: item.name, category: item.category?.name },
          stockOnHand: totalStock,
          stockValue: Math.round(totalStock * Number(item.costPrice) * 100) / 100,
          lastSaleDate: lastSale,
          daysSinceLastSale: daysSince,
          neverSold: !lastSale,
        };
      })
      .sort((a, b) => b.stockValue - a.stockValue);

    const totalValue = deadItems.reduce((sum, d) => sum + d.stockValue, 0);

    return {
      threshold: daysSinceLastSale,
      data: deadItems,
      summary: {
        totalDeadItems: deadItems.length,
        totalDeadStockValue: Math.round(totalValue * 100) / 100,
        neverSoldCount: deadItems.filter((d) => d.neverSold).length,
      },
    };
  }

  async stockMovementHistory(organizationId: string, itemId: string, range: DateRange) {
    // This is essentially the existing getStockMovement with an extended name
    return this.getStockMovement(organizationId, itemId, range);
  }

  async warehouseUtilization(organizationId: string) {
    const warehouses = await this.prisma.warehouse.findMany({
      where: { organizationId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        code: true,
        stockLevels: {
          include: { item: { select: { costPrice: true, sellingPrice: true, name: true } } },
        },
      },
    });

    const data = warehouses.map((wh) => {
      const uniqueItems = new Set(wh.stockLevels.map((sl) => sl.itemId)).size;
      const totalQuantity = wh.stockLevels.reduce((sum, sl) => sum + Number(sl.stockOnHand), 0);
      const totalCostValue = wh.stockLevels.reduce((sum, sl) => sum + Number(sl.stockOnHand) * Number(sl.item.costPrice), 0);
      const totalSellingValue = wh.stockLevels.reduce((sum, sl) => sum + Number(sl.stockOnHand) * Number(sl.item.sellingPrice), 0);

      return {
        warehouse: { id: wh.id, name: wh.name, code: wh.code },
        uniqueItems,
        totalQuantity: Math.round(totalQuantity * 100) / 100,
        totalCostValue: Math.round(totalCostValue * 100) / 100,
        totalSellingValue: Math.round(totalSellingValue * 100) / 100,
        potentialProfit: Math.round((totalSellingValue - totalCostValue) * 100) / 100,
      };
    }).sort((a, b) => b.totalCostValue - a.totalCostValue);

    return {
      data,
      summary: {
        totalWarehouses: data.length,
        totalCostValue: Math.round(data.reduce((sum, d) => sum + d.totalCostValue, 0) * 100) / 100,
        totalSellingValue: Math.round(data.reduce((sum, d) => sum + d.totalSellingValue, 0) * 100) / 100,
      },
    };
  }

  async abcAnalysis(organizationId: string) {
    // Get all items with stock value
    const items = await this.prisma.item.findMany({
      where: { organizationId, status: 'ACTIVE', trackInventory: true },
      include: {
        category: { select: { name: true } },
        stockLevels: { select: { stockOnHand: true } },
      },
    });

    const itemValues = items
      .map((item) => {
        const stock = item.stockLevels.reduce((sum, sl) => sum + Number(sl.stockOnHand), 0);
        return {
          item: { id: item.id, sku: item.sku, name: item.name, category: item.category?.name },
          stockOnHand: stock,
          costPrice: Number(item.costPrice),
          totalValue: stock * Number(item.costPrice),
        };
      })
      .filter((iv) => iv.totalValue > 0)
      .sort((a, b) => b.totalValue - a.totalValue);

    const grandTotal = itemValues.reduce((sum, iv) => sum + iv.totalValue, 0);

    let cumPercent = 0;
    const classified = itemValues.map((iv) => {
      cumPercent += (iv.totalValue / grandTotal) * 100;
      let classification: 'A' | 'B' | 'C';
      if (cumPercent <= 80) classification = 'A';
      else if (cumPercent <= 95) classification = 'B';
      else classification = 'C';

      return {
        ...iv,
        totalValue: Math.round(iv.totalValue * 100) / 100,
        percentOfTotal: Math.round((iv.totalValue / grandTotal) * 10000) / 100,
        cumulativePercent: Math.round(cumPercent * 100) / 100,
        classification,
      };
    });

    const aItems = classified.filter((c) => c.classification === 'A');
    const bItems = classified.filter((c) => c.classification === 'B');
    const cItems = classified.filter((c) => c.classification === 'C');

    return {
      data: classified,
      summary: {
        totalItems: classified.length,
        totalValue: Math.round(grandTotal * 100) / 100,
        classA: { count: aItems.length, value: Math.round(aItems.reduce((s, i) => s + i.totalValue, 0) * 100) / 100 },
        classB: { count: bItems.length, value: Math.round(bItems.reduce((s, i) => s + i.totalValue, 0) * 100) / 100 },
        classC: { count: cItems.length, value: Math.round(cItems.reduce((s, i) => s + i.totalValue, 0) * 100) / 100 },
      },
    };
  }

  async itemProfitability(organizationId: string, range: DateRange) {
    const { fromDate, toDate } = range;

    const invoiceItems = await this.prisma.invoiceItem.groupBy({
      by: ['itemId'],
      where: {
        invoice: {
          organizationId,
          invoiceDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
      },
      _sum: { quantity: true, amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    const itemIds = invoiceItems.map((i) => i.itemId);
    const items = await this.prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, sku: true, name: true, costPrice: true, category: { select: { name: true } } },
    });
    const itemsMap = new Map(items.map((i) => [i.id, i]));

    const data = invoiceItems.map((ii) => {
      const item = itemsMap.get(ii.itemId);
      const qty = Number(ii._sum.quantity) || 0;
      const revenue = Number(ii._sum.amount) || 0;
      const cost = qty * Number(item?.costPrice || 0);
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        item: { id: ii.itemId, sku: item?.sku, name: item?.name, category: item?.category?.name },
        quantitySold: qty,
        revenue: Math.round(revenue * 100) / 100,
        cost: Math.round(cost * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        margin: Math.round(margin * 100) / 100,
      };
    }).sort((a, b) => b.profit - a.profit);

    const totals = data.reduce((acc, d) => ({
      revenue: acc.revenue + d.revenue,
      cost: acc.cost + d.cost,
      profit: acc.profit + d.profit,
    }), { revenue: 0, cost: 0, profit: 0 });

    return {
      period: { fromDate, toDate },
      data,
      summary: {
        totalItems: data.length,
        totalRevenue: Math.round(totals.revenue * 100) / 100,
        totalCost: Math.round(totals.cost * 100) / 100,
        totalProfit: Math.round(totals.profit * 100) / 100,
        overallMargin: totals.revenue > 0 ? Math.round((totals.profit / totals.revenue) * 10000) / 100 : 0,
      },
    };
  }

  // ============ NEW Purchase Reports ============

  async purchaseByCategory(organizationId: string, range: DateRange) {
    const { fromDate, toDate } = range;

    const billItems = await this.prisma.billItem.findMany({
      where: {
        bill: {
          organizationId,
          billDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
        itemId: { not: null },
      },
      select: {
        quantity: true,
        total: true,
        item: { select: { categoryId: true, category: { select: { id: true, name: true } } } },
      },
    });

    const byCategory = new Map<string, { category: string; categoryId: string; quantity: number; totalPurchases: number; lineCount: number }>();
    for (const bi of billItems) {
      const catId = bi.item?.categoryId || 'uncategorized';
      const catName = bi.item?.category?.name || 'Uncategorized';
      const existing = byCategory.get(catId) || { category: catName, categoryId: catId, quantity: 0, totalPurchases: 0, lineCount: 0 };
      existing.quantity += Number(bi.quantity);
      existing.totalPurchases += Number(bi.total);
      existing.lineCount += 1;
      byCategory.set(catId, existing);
    }

    const data = Array.from(byCategory.values()).sort((a, b) => b.totalPurchases - a.totalPurchases);
    const grandTotal = data.reduce((sum, d) => sum + d.totalPurchases, 0);

    return {
      period: { fromDate, toDate },
      data: data.map((d) => ({
        ...d,
        totalPurchases: Math.round(d.totalPurchases * 100) / 100,
        percentOfTotal: grandTotal > 0 ? Math.round((d.totalPurchases / grandTotal) * 10000) / 100 : 0,
      })),
      summary: {
        totalCategories: data.length,
        totalPurchases: Math.round(grandTotal * 100) / 100,
      },
    };
  }

  async purchaseByItem(organizationId: string, range: DateRange, options?: PaginationOptions) {
    const { fromDate, toDate } = range;
    const { page = 1, limit = 25 } = options || {};

    const billItems = await this.prisma.billItem.groupBy({
      by: ['itemId'],
      where: {
        bill: {
          organizationId,
          billDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
        itemId: { not: null },
      },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: 'desc' } },
      skip: (page - 1) * limit,
      take: limit,
    });

    const itemIds = billItems.filter((bi) => bi.itemId).map((bi) => bi.itemId!);
    const items = await this.prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, sku: true, name: true, category: { select: { name: true } } },
    });
    const itemsMap = new Map(items.map((i) => [i.id, i]));

    return {
      period: { fromDate, toDate },
      data: billItems.map((bi) => {
        const item = itemsMap.get(bi.itemId!);
        return {
          item: { id: bi.itemId, sku: item?.sku, name: item?.name, category: item?.category?.name },
          quantityPurchased: Number(bi._sum.quantity) || 0,
          totalPurchases: Math.round(Number(bi._sum.total || 0) * 100) / 100,
        };
      }),
    };
  }

  async vendorPerformance(organizationId: string, range: DateRange) {
    const { fromDate, toDate } = range;

    // Get POs in period
    const pos = await this.prisma.purchaseOrder.findMany({
      where: {
        organizationId,
        orderDate: { gte: fromDate, lte: toDate },
        status: { notIn: ['DRAFT', 'CANCELLED'] },
      },
      select: {
        id: true,
        vendorId: true,
        orderDate: true,
        expectedDate: true,
        total: true,
        receives: {
          select: { receiveDate: true, items: { select: { receivedQty: true, rejectedQty: true, acceptedQty: true } } },
        },
        vendor: { select: { id: true, displayName: true, companyName: true } },
      },
    });

    const byVendor = new Map<string, {
      vendor: any;
      poCount: number;
      totalPurchases: number;
      onTimeCount: number;
      lateCount: number;
      totalLeadDays: number;
      deliveredCount: number;
      totalReceived: number;
      totalRejected: number;
    }>();

    for (const po of pos) {
      const key = po.vendorId;
      const existing = byVendor.get(key) || {
        vendor: po.vendor,
        poCount: 0,
        totalPurchases: 0,
        onTimeCount: 0,
        lateCount: 0,
        totalLeadDays: 0,
        deliveredCount: 0,
        totalReceived: 0,
        totalRejected: 0,
      };

      existing.poCount += 1;
      existing.totalPurchases += Number(po.total);

      for (const recv of po.receives) {
        existing.deliveredCount += 1;
        const leadDays = Math.ceil((recv.receiveDate.getTime() - po.orderDate.getTime()) / (1000 * 60 * 60 * 24));
        existing.totalLeadDays += leadDays;

        if (po.expectedDate && recv.receiveDate <= po.expectedDate) {
          existing.onTimeCount += 1;
        } else if (po.expectedDate) {
          existing.lateCount += 1;
        }

        for (const item of recv.items) {
          existing.totalReceived += Number(item.receivedQty);
          existing.totalRejected += Number(item.rejectedQty);
        }
      }

      byVendor.set(key, existing);
    }

    const data = Array.from(byVendor.values()).map((v) => ({
      vendor: v.vendor,
      poCount: v.poCount,
      totalPurchases: Math.round(v.totalPurchases * 100) / 100,
      onTimeDeliveryRate: v.deliveredCount > 0 ? Math.round((v.onTimeCount / v.deliveredCount) * 10000) / 100 : 0,
      avgLeadTimeDays: v.deliveredCount > 0 ? Math.round(v.totalLeadDays / v.deliveredCount) : 0,
      rejectRate: v.totalReceived > 0 ? Math.round((v.totalRejected / v.totalReceived) * 10000) / 100 : 0,
      totalReceived: Math.round(v.totalReceived * 100) / 100,
      totalRejected: Math.round(v.totalRejected * 100) / 100,
    })).sort((a, b) => b.totalPurchases - a.totalPurchases);

    return {
      period: { fromDate, toDate },
      data,
      summary: {
        totalVendors: data.length,
        avgOnTimeRate: data.length > 0 ? Math.round((data.reduce((s, d) => s + d.onTimeDeliveryRate, 0) / data.length) * 100) / 100 : 0,
      },
    };
  }

  async purchasePriceVariance(organizationId: string, range: DateRange) {
    const { fromDate, toDate } = range;

    const billItems = await this.prisma.billItem.findMany({
      where: {
        bill: {
          organizationId,
          billDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
        itemId: { not: null },
      },
      select: {
        itemId: true,
        quantity: true,
        unitPrice: true,
        total: true,
        item: { select: { id: true, sku: true, name: true, costPrice: true, category: { select: { name: true } } } },
      },
    });

    // Group by item and compute variance
    const byItem = new Map<string, {
      item: any;
      standardPrice: number;
      purchaseCount: number;
      totalQty: number;
      totalActualCost: number;
      totalStandardCost: number;
      prices: number[];
    }>();

    for (const bi of billItems) {
      if (!bi.item) continue;
      const key = bi.itemId!;
      const existing = byItem.get(key) || {
        item: { id: bi.item.id, sku: bi.item.sku, name: bi.item.name, category: bi.item.category?.name },
        standardPrice: Number(bi.item.costPrice),
        purchaseCount: 0,
        totalQty: 0,
        totalActualCost: 0,
        totalStandardCost: 0,
        prices: [],
      };

      const qty = Number(bi.quantity);
      existing.purchaseCount += 1;
      existing.totalQty += qty;
      existing.totalActualCost += Number(bi.total);
      existing.totalStandardCost += qty * Number(bi.item.costPrice);
      existing.prices.push(Number(bi.unitPrice));
      byItem.set(key, existing);
    }

    const data = Array.from(byItem.values()).map((v) => {
      const avgActualPrice = v.totalQty > 0 ? v.totalActualCost / v.totalQty : 0;
      const variance = v.totalActualCost - v.totalStandardCost;
      const variancePercent = v.totalStandardCost > 0 ? (variance / v.totalStandardCost) * 100 : 0;

      return {
        item: v.item,
        standardPrice: v.standardPrice,
        avgActualPrice: Math.round(avgActualPrice * 100) / 100,
        minPrice: Math.min(...v.prices),
        maxPrice: Math.max(...v.prices),
        totalQty: v.totalQty,
        totalActualCost: Math.round(v.totalActualCost * 100) / 100,
        totalStandardCost: Math.round(v.totalStandardCost * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        variancePercent: Math.round(variancePercent * 100) / 100,
      };
    }).sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

    return {
      period: { fromDate, toDate },
      data,
      summary: {
        totalItems: data.length,
        totalVariance: Math.round(data.reduce((s, d) => s + d.variance, 0) * 100) / 100,
        itemsAboveStandard: data.filter((d) => d.variance > 0).length,
        itemsBelowStandard: data.filter((d) => d.variance < 0).length,
      },
    };
  }

  async outstandingPOs(organizationId: string) {
    const pos = await this.prisma.purchaseOrder.findMany({
      where: {
        organizationId,
        status: { in: ['ISSUED', 'PARTIALLY_RECEIVED'] },
      },
      select: {
        id: true,
        orderNumber: true,
        orderDate: true,
        expectedDate: true,
        total: true,
        status: true,
        receiveStatus: true,
        vendor: { select: { id: true, displayName: true } },
        items: { select: { quantity: true, receivedQty: true, total: true } },
      },
      orderBy: { orderDate: 'asc' },
    });

    const data = pos.map((po) => {
      const totalOrdered = po.items.reduce((s, i) => s + Number(i.quantity), 0);
      const totalReceived = po.items.reduce((s, i) => s + Number(i.receivedQty), 0);
      const totalValue = Number(po.total);
      const isOverdue = po.expectedDate && po.expectedDate < new Date();
      const daysOutstanding = Math.ceil((Date.now() - po.orderDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        poNumber: po.orderNumber,
        poId: po.id,
        vendor: po.vendor,
        orderDate: po.orderDate,
        expectedDate: po.expectedDate,
        status: po.status,
        receiveStatus: po.receiveStatus,
        totalOrdered,
        totalReceived,
        pendingQuantity: totalOrdered - totalReceived,
        totalValue: Math.round(totalValue * 100) / 100,
        daysOutstanding,
        isOverdue: !!isOverdue,
      };
    });

    return {
      data,
      summary: {
        totalOutstandingPOs: data.length,
        totalOutstandingValue: Math.round(data.reduce((s, d) => s + d.totalValue, 0) * 100) / 100,
        overdueCount: data.filter((d) => d.isOverdue).length,
      },
    };
  }

  // ============ NEW Financial Reports ============

  async profitAndLoss(organizationId: string, range: DateRange) {
    const { fromDate, toDate } = range;

    const [invoiceAgg, billAgg, paymentAgg, vendorPaymentAgg] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          organizationId,
          invoiceDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
        _count: true,
        _sum: { subtotal: true, taxAmount: true, total: true },
      }),
      this.prisma.bill.aggregate({
        where: {
          organizationId,
          billDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
        _count: true,
        _sum: { subtotal: true, taxAmount: true, total: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          organizationId,
          paymentDate: { gte: fromDate, lte: toDate },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),
      this.prisma.vendorPayment.aggregate({
        where: {
          organizationId,
          paymentDate: { gte: fromDate, lte: toDate },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),
    ]);

    // Estimate COGS from invoice items
    const invoiceItems = await this.prisma.invoiceItem.findMany({
      where: {
        invoice: {
          organizationId,
          invoiceDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
      },
      select: { quantity: true, item: { select: { costPrice: true } } },
    });

    const cogs = invoiceItems.reduce((sum, ii) => sum + Number(ii.quantity) * Number(ii.item.costPrice), 0);
    const revenue = Number(invoiceAgg._sum.subtotal) || 0;
    const expenses = Number(billAgg._sum.subtotal) || 0;
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - (expenses - cogs); // expenses includes COGS-related bills

    return {
      period: { fromDate, toDate },
      revenue: {
        invoiceCount: invoiceAgg._count,
        subtotal: Math.round(revenue * 100) / 100,
        taxCollected: Math.round(Number(invoiceAgg._sum.taxAmount || 0) * 100) / 100,
        total: Math.round(Number(invoiceAgg._sum.total || 0) * 100) / 100,
      },
      costOfGoodsSold: Math.round(cogs * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossMargin: revenue > 0 ? Math.round((grossProfit / revenue) * 10000) / 100 : 0,
      expenses: {
        billCount: billAgg._count,
        subtotal: Math.round(expenses * 100) / 100,
        taxPaid: Math.round(Number(billAgg._sum.taxAmount || 0) * 100) / 100,
        total: Math.round(Number(billAgg._sum.total || 0) * 100) / 100,
      },
      netProfit: Math.round(netProfit * 100) / 100,
      netMargin: revenue > 0 ? Math.round((netProfit / revenue) * 10000) / 100 : 0,
    };
  }

  async cashFlowSummary(organizationId: string, range: DateRange) {
    const { fromDate, toDate } = range;

    const [paymentsReceived, paymentsMade] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          organizationId,
          paymentDate: { gte: fromDate, lte: toDate },
          status: 'COMPLETED',
        },
        select: { paymentDate: true, amount: true, paymentMethod: true },
        orderBy: { paymentDate: 'asc' },
      }),
      this.prisma.vendorPayment.findMany({
        where: {
          organizationId,
          paymentDate: { gte: fromDate, lte: toDate },
          status: 'COMPLETED',
        },
        select: { paymentDate: true, amount: true, paymentMethod: true },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);

    // Group by month
    const byMonth = new Map<string, { inflow: number; outflow: number }>();
    for (const p of paymentsReceived) {
      const key = `${p.paymentDate.getFullYear()}-${String(p.paymentDate.getMonth() + 1).padStart(2, '0')}`;
      const existing = byMonth.get(key) || { inflow: 0, outflow: 0 };
      existing.inflow += Number(p.amount);
      byMonth.set(key, existing);
    }
    for (const p of paymentsMade) {
      const key = `${p.paymentDate.getFullYear()}-${String(p.paymentDate.getMonth() + 1).padStart(2, '0')}`;
      const existing = byMonth.get(key) || { inflow: 0, outflow: 0 };
      existing.outflow += Number(p.amount);
      byMonth.set(key, existing);
    }

    const data = Array.from(byMonth.entries())
      .map(([month, val]) => ({
        month,
        inflow: Math.round(val.inflow * 100) / 100,
        outflow: Math.round(val.outflow * 100) / 100,
        netCashFlow: Math.round((val.inflow - val.outflow) * 100) / 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const totalInflow = paymentsReceived.reduce((s, p) => s + Number(p.amount), 0);
    const totalOutflow = paymentsMade.reduce((s, p) => s + Number(p.amount), 0);

    return {
      period: { fromDate, toDate },
      data,
      summary: {
        totalInflow: Math.round(totalInflow * 100) / 100,
        totalOutflow: Math.round(totalOutflow * 100) / 100,
        netCashFlow: Math.round((totalInflow - totalOutflow) * 100) / 100,
      },
    };
  }

  async revenueByMonth(organizationId: string, year: number) {
    const months: { month: number; label: string; revenue: number; invoiceCount: number }[] = [];

    for (let m = 0; m < 12; m++) {
      const fromDate = new Date(year, m, 1);
      const toDate = new Date(year, m + 1, 0, 23, 59, 59, 999);

      const agg = await this.prisma.invoice.aggregate({
        where: {
          organizationId,
          invoiceDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
        _count: true,
        _sum: { total: true },
      });

      months.push({
        month: m + 1,
        label: fromDate.toLocaleString('en-US', { month: 'short' }),
        revenue: Math.round(Number(agg._sum.total || 0) * 100) / 100,
        invoiceCount: agg._count,
      });
    }

    return {
      year,
      data: months,
      summary: {
        totalRevenue: Math.round(months.reduce((s, m) => s + m.revenue, 0) * 100) / 100,
        totalInvoices: months.reduce((s, m) => s + m.invoiceCount, 0),
        avgMonthlyRevenue: Math.round((months.reduce((s, m) => s + m.revenue, 0) / 12) * 100) / 100,
      },
    };
  }

  async expenseAnalysis(organizationId: string, range: DateRange) {
    const { fromDate, toDate } = range;

    const billItems = await this.prisma.billItem.findMany({
      where: {
        bill: {
          organizationId,
          billDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
      },
      select: {
        total: true,
        description: true,
        itemId: true,
        item: { select: { categoryId: true, category: { select: { name: true } } } },
      },
    });

    const byCategory = new Map<string, { category: string; total: number; count: number }>();
    for (const bi of billItems) {
      const catName = bi.item?.category?.name || bi.description || 'Uncategorized';
      const key = bi.item?.categoryId || catName;
      const existing = byCategory.get(key) || { category: catName, total: 0, count: 0 };
      existing.total += Number(bi.total);
      existing.count += 1;
      byCategory.set(key, existing);
    }

    const data = Array.from(byCategory.values()).sort((a, b) => b.total - a.total);
    const grandTotal = data.reduce((s, d) => s + d.total, 0);

    return {
      period: { fromDate, toDate },
      data: data.map((d) => ({
        category: d.category,
        total: Math.round(d.total * 100) / 100,
        lineCount: d.count,
        percentOfTotal: grandTotal > 0 ? Math.round((d.total / grandTotal) * 10000) / 100 : 0,
      })),
      summary: {
        totalExpenses: Math.round(grandTotal * 100) / 100,
        totalCategories: data.length,
      },
    };
  }

  async outstandingPayments(organizationId: string) {
    const today = new Date();

    const [unpaidInvoices, unpaidBills] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          organizationId,
          status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
          balance: { gt: 0 },
        },
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          dueDate: true,
          total: true,
          balance: true,
          customer: { select: { id: true, displayName: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.bill.findMany({
        where: {
          organizationId,
          status: { in: ['RECEIVED', 'PARTIALLY_PAID', 'OVERDUE'] },
          balance: { gt: 0 },
        },
        select: {
          id: true,
          billNumber: true,
          billDate: true,
          dueDate: true,
          total: true,
          balance: true,
          vendor: { select: { id: true, displayName: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    const receivables = unpaidInvoices.map((inv) => ({
      type: 'receivable' as const,
      number: inv.invoiceNumber,
      contact: inv.customer.displayName,
      contactId: inv.customer.id,
      date: inv.invoiceDate,
      dueDate: inv.dueDate,
      total: Number(inv.total),
      balance: Number(inv.balance),
      daysOverdue: inv.dueDate < today ? Math.ceil((today.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0,
      isOverdue: inv.dueDate < today,
    }));

    const payables = unpaidBills.map((bill) => ({
      type: 'payable' as const,
      number: bill.billNumber,
      contact: bill.vendor.displayName,
      contactId: bill.vendor.id,
      date: bill.billDate,
      dueDate: bill.dueDate,
      total: Number(bill.total),
      balance: Number(bill.balance),
      daysOverdue: bill.dueDate < today ? Math.ceil((today.getTime() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0,
      isOverdue: bill.dueDate < today,
    }));

    return {
      asOf: today,
      receivables,
      payables,
      summary: {
        totalReceivables: Math.round(receivables.reduce((s, r) => s + r.balance, 0) * 100) / 100,
        totalPayables: Math.round(payables.reduce((s, p) => s + p.balance, 0) * 100) / 100,
        overdueReceivables: receivables.filter((r) => r.isOverdue).length,
        overduePayables: payables.filter((p) => p.isOverdue).length,
      },
    };
  }

  async paymentMethodAnalysis(organizationId: string, range: DateRange) {
    const { fromDate, toDate } = range;

    const [customerPayments, vendorPayments] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          organizationId,
          paymentDate: { gte: fromDate, lte: toDate },
          status: 'COMPLETED',
        },
        select: { paymentMethod: true, amount: true },
      }),
      this.prisma.vendorPayment.findMany({
        where: {
          organizationId,
          paymentDate: { gte: fromDate, lte: toDate },
          status: 'COMPLETED',
        },
        select: { paymentMethod: true, amount: true },
      }),
    ]);

    const byMethodReceived = new Map<string, { count: number; total: number }>();
    for (const p of customerPayments) {
      const existing = byMethodReceived.get(p.paymentMethod) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += Number(p.amount);
      byMethodReceived.set(p.paymentMethod, existing);
    }

    const byMethodPaid = new Map<string, { count: number; total: number }>();
    for (const p of vendorPayments) {
      const existing = byMethodPaid.get(p.paymentMethod) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += Number(p.amount);
      byMethodPaid.set(p.paymentMethod, existing);
    }

    const formatData = (m: Map<string, { count: number; total: number }>) => {
      const grandTotal = Array.from(m.values()).reduce((s, v) => s + v.total, 0);
      return Array.from(m.entries())
        .map(([method, val]) => ({
          method,
          count: val.count,
          total: Math.round(val.total * 100) / 100,
          percentOfTotal: grandTotal > 0 ? Math.round((val.total / grandTotal) * 10000) / 100 : 0,
        }))
        .sort((a, b) => b.total - a.total);
    };

    return {
      period: { fromDate, toDate },
      received: formatData(byMethodReceived),
      paid: formatData(byMethodPaid),
      summary: {
        totalReceived: Math.round(customerPayments.reduce((s, p) => s + Number(p.amount), 0) * 100) / 100,
        totalPaid: Math.round(vendorPayments.reduce((s, p) => s + Number(p.amount), 0) * 100) / 100,
      },
    };
  }

  async customerLifetimeValue(organizationId: string) {
    const customers = await this.prisma.contact.findMany({
      where: {
        organizationId,
        type: { in: ['CUSTOMER', 'BOTH'] },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        displayName: true,
        companyName: true,
        createdAt: true,
        invoices: {
          where: { status: { notIn: ['DRAFT', 'VOID'] } },
          select: { total: true, invoiceDate: true },
        },
      },
    });

    const data = customers
      .map((c) => {
        const totalRevenue = c.invoices.reduce((s, inv) => s + Number(inv.total), 0);
        const invoiceCount = c.invoices.length;
        const firstInvoice = c.invoices.length > 0 ? c.invoices.reduce((min, inv) => inv.invoiceDate < min ? inv.invoiceDate : min, c.invoices[0].invoiceDate) : null;
        const lastInvoice = c.invoices.length > 0 ? c.invoices.reduce((max, inv) => inv.invoiceDate > max ? inv.invoiceDate : max, c.invoices[0].invoiceDate) : null;
        const daysSinceFirst = firstInvoice ? Math.ceil((Date.now() - firstInvoice.getTime()) / (1000 * 60 * 60 * 24)) : 0;

        return {
          customer: { id: c.id, displayName: c.displayName, companyName: c.companyName },
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          invoiceCount,
          avgOrderValue: invoiceCount > 0 ? Math.round((totalRevenue / invoiceCount) * 100) / 100 : 0,
          firstInvoiceDate: firstInvoice,
          lastInvoiceDate: lastInvoice,
          customerAgeDays: daysSinceFirst,
        };
      })
      .filter((c) => c.invoiceCount > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const totalRevenue = data.reduce((s, d) => s + d.totalRevenue, 0);

    return {
      data,
      summary: {
        totalCustomers: data.length,
        totalLifetimeRevenue: Math.round(totalRevenue * 100) / 100,
        avgLifetimeValue: data.length > 0 ? Math.round((totalRevenue / data.length) * 100) / 100 : 0,
      },
    };
  }

  // ============ NEW Compliance Reports ============

  async sstFilingSummary(organizationId: string, range: DateRange) {
    // Reuses the existing SST report with filing-focused presentation
    return this.getSSTReport(organizationId, range);
  }

  async eInvoiceSubmissionLog(organizationId: string, range: DateRange) {
    const { fromDate, toDate } = range;

    const submissions = await this.prisma.eInvoiceSubmission.findMany({
      where: {
        organizationId,
        createdAt: { gte: fromDate, lte: toDate },
      },
      select: {
        id: true,
        submissionUuid: true,
        documentUuid: true,
        status: true,
        submittedAt: true,
        validatedAt: true,
        cancelledAt: true,
        rejectionReasons: true,
        retryCount: true,
        lastError: true,
        invoice: {
          select: {
            invoiceNumber: true,
            total: true,
            customer: { select: { displayName: true } },
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const statusCounts = {
      PENDING: 0,
      SUBMITTED: 0,
      VALIDATED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };

    for (const sub of submissions) {
      if (sub.status in statusCounts) {
        statusCounts[sub.status as keyof typeof statusCounts] += 1;
      }
    }

    return {
      period: { fromDate, toDate },
      data: submissions.map((s) => ({
        id: s.id,
        invoiceNumber: s.invoice.invoiceNumber,
        customer: s.invoice.customer.displayName,
        total: Number(s.invoice.total),
        submissionUuid: s.submissionUuid,
        documentUuid: s.documentUuid,
        status: s.status,
        submittedAt: s.submittedAt,
        validatedAt: s.validatedAt,
        cancelledAt: s.cancelledAt,
        rejectionReasons: s.rejectionReasons,
        retryCount: s.retryCount,
        lastError: s.lastError,
        createdAt: s.createdAt,
      })),
      summary: {
        total: submissions.length,
        ...statusCounts,
        successRate: submissions.length > 0 ? Math.round((statusCounts.VALIDATED / submissions.length) * 10000) / 100 : 0,
      },
    };
  }

  async taxAuditTrail(organizationId: string, range: DateRange) {
    const { fromDate, toDate } = range;

    const [invoices, bills] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          organizationId,
          invoiceDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT'] },
          taxAmount: { gt: 0 },
        },
        select: {
          invoiceNumber: true,
          invoiceDate: true,
          subtotal: true,
          taxAmount: true,
          total: true,
          status: true,
          customer: { select: { displayName: true, taxNumber: true } },
        },
        orderBy: { invoiceDate: 'asc' },
      }),
      this.prisma.bill.findMany({
        where: {
          organizationId,
          billDate: { gte: fromDate, lte: toDate },
          status: { notIn: ['DRAFT'] },
          taxAmount: { gt: 0 },
        },
        select: {
          billNumber: true,
          billDate: true,
          subtotal: true,
          taxAmount: true,
          total: true,
          status: true,
          vendor: { select: { displayName: true, taxNumber: true } },
        },
        orderBy: { billDate: 'asc' },
      }),
    ]);

    const salesTransactions = invoices.map((inv) => ({
      type: 'SALE' as const,
      documentNumber: inv.invoiceNumber,
      date: inv.invoiceDate,
      party: inv.customer.displayName,
      partyTaxNumber: inv.customer.taxNumber,
      subtotal: Number(inv.subtotal),
      taxAmount: Number(inv.taxAmount),
      total: Number(inv.total),
      status: inv.status,
    }));

    const purchaseTransactions = bills.map((b) => ({
      type: 'PURCHASE' as const,
      documentNumber: b.billNumber,
      date: b.billDate,
      party: b.vendor.displayName,
      partyTaxNumber: b.vendor.taxNumber,
      subtotal: Number(b.subtotal),
      taxAmount: Number(b.taxAmount),
      total: Number(b.total),
      status: b.status,
    }));

    const allTransactions = [...salesTransactions, ...purchaseTransactions].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    const totalOutputTax = salesTransactions.reduce((s, t) => s + t.taxAmount, 0);
    const totalInputTax = purchaseTransactions.reduce((s, t) => s + t.taxAmount, 0);

    return {
      period: { fromDate, toDate },
      data: allTransactions,
      summary: {
        totalTransactions: allTransactions.length,
        salesTransactions: salesTransactions.length,
        purchaseTransactions: purchaseTransactions.length,
        totalOutputTax: Math.round(totalOutputTax * 100) / 100,
        totalInputTax: Math.round(totalInputTax * 100) / 100,
        netTax: Math.round((totalOutputTax - totalInputTax) * 100) / 100,
      },
    };
  }

  async annualTaxSummary(organizationId: string, year: number) {
    const months: { month: number; label: string; outputTax: number; inputTax: number; netTax: number }[] = [];

    for (let m = 0; m < 12; m++) {
      const fromDate = new Date(year, m, 1);
      const toDate = new Date(year, m + 1, 0, 23, 59, 59, 999);

      const [invoiceAgg, billAgg] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: {
            organizationId,
            invoiceDate: { gte: fromDate, lte: toDate },
            status: { notIn: ['DRAFT', 'VOID'] },
          },
          _sum: { taxAmount: true },
        }),
        this.prisma.bill.aggregate({
          where: {
            organizationId,
            billDate: { gte: fromDate, lte: toDate },
            status: { notIn: ['DRAFT', 'VOID'] },
          },
          _sum: { taxAmount: true },
        }),
      ]);

      const outputTax = Number(invoiceAgg._sum.taxAmount || 0);
      const inputTax = Number(billAgg._sum.taxAmount || 0);

      months.push({
        month: m + 1,
        label: fromDate.toLocaleString('en-US', { month: 'short' }),
        outputTax: Math.round(outputTax * 100) / 100,
        inputTax: Math.round(inputTax * 100) / 100,
        netTax: Math.round((outputTax - inputTax) * 100) / 100,
      });
    }

    const totalOutputTax = months.reduce((s, m) => s + m.outputTax, 0);
    const totalInputTax = months.reduce((s, m) => s + m.inputTax, 0);

    return {
      year,
      data: months,
      summary: {
        totalOutputTax: Math.round(totalOutputTax * 100) / 100,
        totalInputTax: Math.round(totalInputTax * 100) / 100,
        netTaxPayable: Math.round((totalOutputTax - totalInputTax) * 100) / 100,
      },
    };
  }

  async getPayablesAging(organizationId: string) {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

    const bills = await this.prisma.bill.findMany({
      where: {
        organizationId,
        status: { in: ['RECEIVED', 'PARTIALLY_PAID', 'OVERDUE'] },
        balance: { gt: 0 },
      },
      select: {
        id: true,
        billNumber: true,
        billDate: true,
        dueDate: true,
        total: true,
        balance: true,
        vendor: { select: { id: true, displayName: true } },
      },
    });

    const aging = {
      current: { bills: [] as any[], total: 0 },
      '1-30': { bills: [] as any[], total: 0 },
      '31-60': { bills: [] as any[], total: 0 },
      '61-90': { bills: [] as any[], total: 0 },
      '90+': { bills: [] as any[], total: 0 },
    };

    for (const bill of bills) {
      const balance = Number(bill.balance);
      const dueDate = new Date(bill.dueDate);

      if (dueDate >= today) {
        aging.current.bills.push(bill);
        aging.current.total += balance;
      } else if (dueDate >= thirtyDaysAgo) {
        aging['1-30'].bills.push(bill);
        aging['1-30'].total += balance;
      } else if (dueDate >= sixtyDaysAgo) {
        aging['31-60'].bills.push(bill);
        aging['31-60'].total += balance;
      } else if (dueDate >= ninetyDaysAgo) {
        aging['61-90'].bills.push(bill);
        aging['61-90'].total += balance;
      } else {
        aging['90+'].bills.push(bill);
        aging['90+'].total += balance;
      }
    }

    const totalPayable = Object.values(aging).reduce((sum, a) => sum + a.total, 0);

    return {
      asOf: today,
      totalPayable,
      aging: Object.entries(aging).map(([bucket, data]) => ({
        bucket,
        count: data.bills.length,
        total: data.total,
        bills: data.bills.slice(0, 5),
      })),
    };
  }
}
