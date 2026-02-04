import { api } from './api';

// Types
export interface DateRange {
  fromDate: string;
  toDate: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SalesSummary {
  totalOrders: number;
  totalInvoiced: number;
  totalReceived: number;
  outstandingAmount: number;
}

export interface SalesByCustomerItem {
  customerId: string;
  customerName: string;
  orderCount: number;
  invoiceCount: number;
  totalSales: number;
  percentOfTotal: number;
}

export interface SalesByCustomerResponse {
  data: SalesByCustomerItem[];
  summary: {
    totalCustomers: number;
    totalSales: number;
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface SalesByItemItem {
  itemId: string;
  itemName: string;
  sku: string;
  quantitySold: number;
  totalSales: number;
  averagePrice: number;
}

export interface SalesByItemResponse {
  data: SalesByItemItem[];
  summary: {
    totalItems: number;
    totalQuantity: number;
    totalSales: number;
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface AgingBucket {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
}

export interface ReceivablesAgingItem {
  customerId: string;
  customerName: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
}

export interface ReceivablesAgingResponse {
  data: ReceivablesAgingItem[];
  summary: AgingBucket;
}

export interface PayablesAgingItem {
  vendorId: string;
  vendorName: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
}

export interface PayablesAgingResponse {
  data: PayablesAgingItem[];
  summary: AgingBucket;
}

export interface InventorySummaryItem {
  itemId: string;
  itemName: string;
  sku: string;
  onHand: number;
  committed: number;
  available: number;
  reorderLevel: number;
  totalValue: number;
  isLowStock: boolean;
}

export interface InventorySummaryResponse {
  data: InventorySummaryItem[];
  summary: {
    totalItems: number;
    totalValue: number;
    lowStockCount: number;
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface InventoryValuationItem {
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  costPrice: number;
  totalValue: number;
}

export interface InventoryValuationResponse {
  data: InventoryValuationItem[];
  summary: {
    totalItems: number;
    totalQuantity: number;
    totalValue: number;
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Service
export const reportsService = {
  // Sales Reports
  async getSalesSummary(dateRange: DateRange): Promise<SalesSummary> {
    const response = await api.get('/reports/sales/summary', {
      params: { fromDate: dateRange.fromDate, toDate: dateRange.toDate },
    });
    return response.data;
  },

  async getSalesByCustomer(
    dateRange: DateRange,
    pagination?: PaginationParams
  ): Promise<SalesByCustomerResponse> {
    const response = await api.get('/reports/sales/by-customer', {
      params: {
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
        ...pagination,
      },
    });

    // Transform backend response to expected format
    const rawData = response.data.data || [];
    const totalSales = rawData.reduce((sum: number, item: { totalSales?: number }) => sum + (item.totalSales || 0), 0);

    return {
      data: rawData.map((item: { customer?: { id: string; displayName?: string; companyName?: string }; orderCount?: number; invoiceCount?: number; totalSales?: number }) => ({
        customerId: item.customer?.id || '',
        customerName: item.customer?.displayName || item.customer?.companyName || 'Unknown',
        orderCount: item.orderCount || 0,
        invoiceCount: item.invoiceCount || 0,
        totalSales: item.totalSales || 0,
        percentOfTotal: totalSales > 0 ? ((item.totalSales || 0) / totalSales) * 100 : 0,
      })),
      summary: {
        totalCustomers: rawData.length,
        totalSales: totalSales,
      },
      meta: {
        page: pagination?.page || 1,
        limit: pagination?.limit || 25,
        total: rawData.length,
        hasMore: false,
      },
    };
  },

  async getSalesByItem(
    dateRange: DateRange,
    pagination?: PaginationParams
  ): Promise<SalesByItemResponse> {
    const response = await api.get('/reports/sales/by-item', {
      params: {
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
        ...pagination,
      },
    });

    // Transform backend response to expected format
    const rawData = response.data.data || [];
    const totalSales = rawData.reduce((sum: number, item: { totalSales?: number }) => sum + (item.totalSales || 0), 0);
    const totalQuantity = rawData.reduce((sum: number, item: { quantitySold?: number }) => sum + (item.quantitySold || 0), 0);

    return {
      data: rawData.map((item: { item?: { id: string; name?: string; sku?: string }; quantitySold?: number; totalSales?: number }) => ({
        itemId: item.item?.id || '',
        itemName: item.item?.name || 'Unknown',
        sku: item.item?.sku || '',
        quantitySold: item.quantitySold || 0,
        totalSales: item.totalSales || 0,
        averagePrice: item.quantitySold ? (item.totalSales || 0) / item.quantitySold : 0,
      })),
      summary: {
        totalItems: rawData.length,
        totalQuantity: totalQuantity,
        totalSales: totalSales,
      },
      meta: {
        page: pagination?.page || 1,
        limit: pagination?.limit || 25,
        total: rawData.length,
        hasMore: false,
      },
    };
  },

  async getReceivablesAging(): Promise<ReceivablesAgingResponse> {
    const response = await api.get('/reports/sales/receivables-aging');
    return response.data;
  },

  // Inventory Reports
  async getInventorySummary(pagination?: PaginationParams): Promise<InventorySummaryResponse> {
    const response = await api.get('/reports/inventory/summary', { params: pagination });
    return response.data;
  },

  async getInventoryValuation(
    warehouseId?: string,
    pagination?: PaginationParams
  ): Promise<InventoryValuationResponse> {
    const response = await api.get('/reports/inventory/valuation', {
      params: { warehouseId, ...pagination },
    });
    return response.data;
  },

  // Purchase Reports
  async getPayablesAging(): Promise<PayablesAgingResponse> {
    const response = await api.get('/reports/purchases/payables-aging');
    return response.data;
  },
};
