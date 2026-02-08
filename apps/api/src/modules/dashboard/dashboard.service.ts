import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CacheService } from '@/modules/cache/cache.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getDashboardOverview(organizationId: string) {
    const cacheKey = this.cacheService.buildKey('dashboard', 'overview', organizationId);
    return this.cacheService.wrap(cacheKey, () => this.fetchDashboardOverview(organizationId), 60);
  }

  private async fetchDashboardOverview(organizationId: string) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const [
      // Current month sales
      monthSales,
      // Year to date sales
      ytdSales,
      // Outstanding receivables
      receivables,
      // Outstanding payables
      payables,
      // Low stock count
      lowStockCount,
      // Pending orders
      pendingOrders,
      // Recent activity
      recentInvoices,
      recentOrders,
    ] = await Promise.all([
      // Month sales
      this.prisma.invoice.aggregate({
        where: {
          organizationId,
          invoiceDate: { gte: startOfMonth },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
        _sum: { total: true },
        _count: true,
      }),

      // YTD sales
      this.prisma.invoice.aggregate({
        where: {
          organizationId,
          invoiceDate: { gte: startOfYear },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
        _sum: { total: true },
      }),

      // Receivables
      this.prisma.invoice.aggregate({
        where: {
          organizationId,
          status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
          balance: { gt: 0 },
        },
        _sum: { balance: true },
        _count: true,
      }),

      // Payables
      this.prisma.bill.aggregate({
        where: {
          organizationId,
          status: { in: ['RECEIVED', 'PARTIALLY_PAID', 'OVERDUE'] },
          balance: { gt: 0 },
        },
        _sum: { balance: true },
        _count: true,
      }),

      // Low stock
      this.getLowStockCount(organizationId),

      // Pending orders
      this.prisma.salesOrder.count({
        where: {
          organizationId,
          status: { in: ['CONFIRMED', 'PACKED'] },
        },
      }),

      // Recent invoices
      this.prisma.invoice.findMany({
        where: { organizationId },
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          total: true,
          status: true,
          customer: { select: { displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Recent orders
      this.prisma.salesOrder.findMany({
        where: { organizationId },
        select: {
          id: true,
          orderNumber: true,
          orderDate: true,
          total: true,
          status: true,
          customer: { select: { displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      kpis: {
        monthSales: {
          total: Number(monthSales._sum.total) || 0,
          count: monthSales._count,
        },
        ytdSales: Number(ytdSales._sum.total) || 0,
        receivables: {
          total: Number(receivables._sum.balance) || 0,
          count: receivables._count,
        },
        payables: {
          total: Number(payables._sum.balance) || 0,
          count: payables._count,
        },
        lowStockItems: lowStockCount,
        pendingOrders: pendingOrders,
      },
      recentActivity: {
        invoices: recentInvoices,
        orders: recentOrders,
      },
    };
  }

  private async getLowStockCount(organizationId: string): Promise<number> {
    const items = await this.prisma.item.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        trackInventory: true,
      },
      include: {
        stockLevels: true,
      },
    });

    return items.filter((item) => {
      const totalStock = item.stockLevels.reduce(
        (sum, sl) => sum + Number(sl.stockOnHand),
        0
      );
      return totalStock <= Number(item.reorderLevel);
    }).length;
  }

  async getSalesTrend(organizationId: string, months: number = 12) {
    const cacheKey = this.cacheService.buildKey('dashboard', 'sales-trend', organizationId, String(months));
    return this.cacheService.wrap(cacheKey, () => this.fetchSalesTrend(organizationId, months), 60);
  }

  private async fetchSalesTrend(organizationId: string, months: number = 12) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        invoiceDate: { gte: startDate, lte: endDate },
        status: { notIn: ['DRAFT', 'VOID'] },
      },
      select: {
        invoiceDate: true,
        total: true,
      },
    });

    // Group by month
    const monthlyData = new Map<string, { sales: number; count: number }>();

    for (let i = 0; i < months; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.set(key, { sales: 0, count: 0 });
    }

    for (const invoice of invoices) {
      const date = new Date(invoice.invoiceDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyData.get(key);
      if (existing) {
        existing.sales += Number(invoice.total);
        existing.count += 1;
      }
    }

    return {
      period: { startDate, endDate },
      data: Array.from(monthlyData.entries()).map(([month, data]) => ({
        month,
        sales: Math.round(data.sales * 100) / 100,
        invoiceCount: data.count,
      })),
    };
  }

  async getTopSellingItems(organizationId: string, limit: number = 10) {
    const cacheKey = this.cacheService.buildKey('dashboard', 'top-items', organizationId, String(limit));
    return this.cacheService.wrap(cacheKey, () => this.fetchTopSellingItems(organizationId, limit), 60);
  }

  private async fetchTopSellingItems(organizationId: string, limit: number = 10) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topItems = await this.prisma.invoiceItem.groupBy({
      by: ['itemId'],
      where: {
        invoice: {
          organizationId,
          invoiceDate: { gte: thirtyDaysAgo },
          status: { notIn: ['DRAFT', 'VOID'] },
        },
      },
      _sum: { quantity: true, amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });

    const itemIds = topItems.map((t) => t.itemId);
    const items = await this.prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, sku: true, name: true },
    });

    const itemsMap = new Map(items.map((i) => [i.id, i]));

    return {
      period: { days: 30 },
      items: topItems.map((t) => ({
        item: itemsMap.get(t.itemId),
        quantitySold: Number(t._sum.quantity) || 0,
        revenue: Number(t._sum.amount) || 0,
      })),
    };
  }

  async getTopCustomers(organizationId: string, limit: number = 10) {
    const cacheKey = this.cacheService.buildKey('dashboard', 'top-customers', organizationId, String(limit));
    return this.cacheService.wrap(cacheKey, () => this.fetchTopCustomers(organizationId, limit), 60);
  }

  private async fetchTopCustomers(organizationId: string, limit: number = 10) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topCustomers = await this.prisma.invoice.groupBy({
      by: ['customerId'],
      where: {
        organizationId,
        invoiceDate: { gte: thirtyDaysAgo },
        status: { notIn: ['DRAFT', 'VOID'] },
      },
      _sum: { total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    const customerIds = topCustomers.map((t) => t.customerId);
    const customers = await this.prisma.contact.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, displayName: true, companyName: true },
    });

    const customersMap = new Map(customers.map((c) => [c.id, c]));

    return {
      period: { days: 30 },
      customers: topCustomers.map((t) => ({
        customer: customersMap.get(t.customerId),
        invoiceCount: t._count,
        totalSpent: Number(t._sum.total) || 0,
      })),
    };
  }

  async getAlerts(organizationId: string) {
    const cacheKey = this.cacheService.buildKey('dashboard', 'alerts', organizationId);
    return this.cacheService.wrap(cacheKey, () => this.fetchAlerts(organizationId), 60);
  }

  private async fetchAlerts(organizationId: string) {
    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [lowStockItems, overdueInvoices, overdueBills, expiringBatches] = await Promise.all([
      // Low stock items
      this.getLowStockItems(organizationId, 5),

      // Overdue invoices
      this.prisma.invoice.findMany({
        where: {
          organizationId,
          status: { in: ['SENT', 'PARTIALLY_PAID'] },
          dueDate: { lt: today },
          balance: { gt: 0 },
        },
        select: {
          id: true,
          invoiceNumber: true,
          dueDate: true,
          balance: true,
          customer: { select: { displayName: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),

      // Overdue bills
      this.prisma.bill.findMany({
        where: {
          organizationId,
          status: { in: ['RECEIVED', 'PARTIALLY_PAID'] },
          dueDate: { lt: today },
          balance: { gt: 0 },
        },
        select: {
          id: true,
          billNumber: true,
          dueDate: true,
          balance: true,
          vendor: { select: { displayName: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),

      // Expiring batches (within 7 days)
      this.prisma.batch.findMany({
        where: {
          item: { organizationId },
          expiryDate: { lte: sevenDaysFromNow, gte: today },
          quantity: { gt: 0 },
        },
        select: {
          id: true,
          batchNumber: true,
          expiryDate: true,
          quantity: true,
          item: { select: { sku: true, name: true } },
        },
        orderBy: { expiryDate: 'asc' },
        take: 5,
      }),
    ]);

    return {
      lowStock: {
        count: lowStockItems.length,
        items: lowStockItems,
      },
      overdueReceivables: {
        count: overdueInvoices.length,
        invoices: overdueInvoices.map((inv) => ({
          ...inv,
          balance: Number(inv.balance),
        })),
      },
      overduePayables: {
        count: overdueBills.length,
        bills: overdueBills.map((bill) => ({
          ...bill,
          balance: Number(bill.balance),
        })),
      },
      expiringBatches: {
        count: expiringBatches.length,
        batches: expiringBatches.map((b) => ({
          ...b,
          quantity: Number(b.quantity),
        })),
      },
    };
  }

  // ============================================
  // DASHBOARD LAYOUT
  // ============================================

  async getDashboardLayout(userId: string) {
    const layout = await this.prisma.userDashboardLayout.findUnique({
      where: { userId },
    });

    if (!layout) {
      return {
        layoutConfig: this.getDefaultLayout(),
        widgetSettings: {},
      };
    }

    return {
      layoutConfig: layout.layoutConfig,
      widgetSettings: layout.widgetSettings,
    };
  }

  async saveDashboardLayout(
    userId: string,
    layoutConfig: any[],
    widgetSettings: Record<string, any>,
  ) {
    const layout = await this.prisma.userDashboardLayout.upsert({
      where: { userId },
      update: {
        layoutConfig,
        widgetSettings,
      },
      create: {
        userId,
        layoutConfig,
        widgetSettings,
      },
    });

    return {
      layoutConfig: layout.layoutConfig,
      widgetSettings: layout.widgetSettings,
    };
  }

  private getDefaultLayout() {
    return [
      { id: 'sales-kpi', type: 'sales-kpi', x: 0, y: 0, w: 6, h: 2, visible: true },
      { id: 'inventory-kpi', type: 'inventory', x: 6, y: 0, w: 3, h: 2, visible: true },
      { id: 'pending-orders', type: 'pending-orders', x: 9, y: 0, w: 3, h: 2, visible: true },
      { id: 'receivables', type: 'receivables', x: 0, y: 2, w: 3, h: 2, visible: true },
      { id: 'payables', type: 'payables', x: 3, y: 2, w: 3, h: 2, visible: true },
      { id: 'cash-flow', type: 'cash-flow', x: 6, y: 2, w: 6, h: 2, visible: true },
      { id: 'sales-chart', type: 'sales-chart', x: 0, y: 4, w: 6, h: 4, visible: true },
      { id: 'top-items', type: 'top-items', x: 6, y: 4, w: 6, h: 4, visible: true },
      { id: 'top-customers', type: 'top-customers', x: 0, y: 8, w: 6, h: 4, visible: true },
      { id: 'pending-actions', type: 'pending-actions', x: 6, y: 8, w: 6, h: 4, visible: true },
      { id: 'recent-activity', type: 'recent-activity', x: 0, y: 12, w: 12, h: 4, visible: true },
      { id: 'low-stock', type: 'low-stock', x: 0, y: 16, w: 6, h: 4, visible: false },
      { id: 'reorder-alerts', type: 'reorder-alerts', x: 6, y: 16, w: 6, h: 4, visible: false },
    ];
  }

  private async getLowStockItems(organizationId: string, limit: number) {
    const items = await this.prisma.item.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        trackInventory: true,
      },
      include: {
        stockLevels: true,
      },
    });

    const lowStockItems = items
      .map((item) => {
        const totalStock = item.stockLevels.reduce(
          (sum, sl) => sum + Number(sl.stockOnHand),
          0
        );
        return {
          id: item.id,
          sku: item.sku,
          name: item.name,
          currentStock: totalStock,
          reorderLevel: Number(item.reorderLevel),
          deficit: Number(item.reorderLevel) - totalStock,
        };
      })
      .filter((item) => item.currentStock <= item.reorderLevel)
      .sort((a, b) => b.deficit - a.deficit)
      .slice(0, limit);

    return lowStockItems;
  }
}
