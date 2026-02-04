import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
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

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly excelExportService: ExcelExportService,
    private readonly pdfExportService: PdfExportService,
  ) {}

  // ============ Stock Aging Report ============

  async getStockAgingReport(
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
        const item = itemsMap.get(i.itemId);
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
