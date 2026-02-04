import { api } from './api';

// Types matching actual backend responses

export interface DashboardOverview {
  kpis: {
    monthSales: { total: number; count: number };
    ytdSales: number;
    receivables: { total: number; count: number };
    payables: { total: number; count: number };
    lowStockItems: number;
    pendingOrders: number;
  };
  recentActivity: {
    invoices: Array<{
      id: string;
      invoiceNumber: string;
      invoiceDate: string;
      total: number;
      status: string;
      customer: { displayName: string };
    }>;
    orders: Array<{
      id: string;
      orderNumber: string;
      orderDate: string;
      total: number;
      status: string;
      customer: { displayName: string };
    }>;
  };
}

export interface SalesTrendData {
  month: string;
  sales: number;
  invoiceCount: number;
}

export interface SalesTrendResponse {
  period: { startDate: string; endDate: string };
  data: SalesTrendData[];
}

export interface TopItem {
  item: { id: string; sku: string; name: string } | undefined;
  quantitySold: number;
  revenue: number;
}

export interface TopItemsResponse {
  period: { days: number };
  items: TopItem[];
}

export interface TopCustomer {
  customer: { id: string; displayName: string; companyName: string } | undefined;
  invoiceCount: number;
  totalSpent: number;
}

export interface TopCustomersResponse {
  period: { days: number };
  customers: TopCustomer[];
}

export interface LowStockItem {
  id: string;
  sku: string;
  name: string;
  currentStock: number;
  reorderLevel: number;
  deficit: number;
}

export interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  dueDate: string;
  balance: number;
  customer: { displayName: string };
}

export interface OverdueBill {
  id: string;
  billNumber: string;
  dueDate: string;
  balance: number;
  vendor: { displayName: string };
}

export interface ExpiringBatch {
  id: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  item: { sku: string; name: string };
}

export interface DashboardAlerts {
  lowStock: { count: number; items: LowStockItem[] };
  overdueReceivables: { count: number; invoices: OverdueInvoice[] };
  overduePayables: { count: number; bills: OverdueBill[] };
  expiringBatches: { count: number; batches: ExpiringBatch[] };
}

// Legacy types for backward compatibility (used by existing components)
export interface DashboardAlert {
  id: string;
  type: 'LOW_STOCK' | 'OVERDUE_INVOICE' | 'OVERDUE_BILL' | 'EXPIRING_BATCH';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  link?: string;
  createdAt: string;
}

export interface RecentActivity {
  id: string;
  type: string;
  description: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  createdAt: string;
}

// Service
export const dashboardService = {
  async getOverview(): Promise<DashboardOverview> {
    const response = await api.get('/dashboard');
    return response.data;
  },

  async getSalesTrend(months: number = 12): Promise<SalesTrendData[]> {
    const response = await api.get<SalesTrendResponse>('/dashboard/sales-trend', {
      params: { months },
    });
    // Extract data array from wrapped response
    return response.data.data || [];
  },

  async getTopItems(limit: number = 10): Promise<TopItem[]> {
    const response = await api.get<TopItemsResponse>('/dashboard/top-items', { params: { limit } });
    // Extract items array from wrapped response
    return response.data.items || [];
  },

  async getTopCustomers(limit: number = 10): Promise<TopCustomer[]> {
    const response = await api.get<TopCustomersResponse>('/dashboard/top-customers', {
      params: { limit },
    });
    // Extract customers array from wrapped response
    return response.data.customers || [];
  },

  async getAlerts(): Promise<DashboardAlerts> {
    const response = await api.get<DashboardAlerts>('/dashboard/alerts');
    return response.data;
  },

  // Helper to convert alerts to flat array format for components that need it
  async getAlertsFlat(): Promise<DashboardAlert[]> {
    const alerts = await this.getAlerts();
    const flatAlerts: DashboardAlert[] = [];

    // Convert low stock items
    alerts.lowStock.items.forEach((item) => {
      flatAlerts.push({
        id: item.id,
        type: 'LOW_STOCK',
        priority: item.deficit > item.reorderLevel ? 'high' : 'medium',
        title: `Low Stock: ${item.name}`,
        message: `${item.currentStock} remaining (reorder at ${item.reorderLevel})`,
        link: `/inventory/items/${item.id}`,
        createdAt: new Date().toISOString(),
      });
    });

    // Convert overdue invoices
    alerts.overdueReceivables.invoices.forEach((inv) => {
      flatAlerts.push({
        id: inv.id,
        type: 'OVERDUE_INVOICE',
        priority: 'high',
        title: `Overdue Invoice: ${inv.invoiceNumber}`,
        message: `RM ${inv.balance.toLocaleString()} from ${inv.customer.displayName}`,
        link: `/sales/invoices/${inv.id}`,
        createdAt: inv.dueDate,
      });
    });

    // Convert overdue bills
    alerts.overduePayables.bills.forEach((bill) => {
      flatAlerts.push({
        id: bill.id,
        type: 'OVERDUE_BILL',
        priority: 'high',
        title: `Overdue Bill: ${bill.billNumber}`,
        message: `RM ${bill.balance.toLocaleString()} to ${bill.vendor.displayName}`,
        link: `/purchases/bills/${bill.id}`,
        createdAt: bill.dueDate,
      });
    });

    // Convert expiring batches
    alerts.expiringBatches.batches.forEach((batch) => {
      flatAlerts.push({
        id: batch.id,
        type: 'EXPIRING_BATCH',
        priority: 'medium',
        title: `Expiring: ${batch.item.name}`,
        message: `Batch ${batch.batchNumber} expires ${new Date(batch.expiryDate).toLocaleDateString()}`,
        link: `/inventory/items`,
        createdAt: batch.expiryDate,
      });
    });

    return flatAlerts;
  },
};
