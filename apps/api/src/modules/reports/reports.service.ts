import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

interface DateRange {
  fromDate: Date;
  toDate: Date;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

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
