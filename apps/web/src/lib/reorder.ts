import { api } from './api';
import type { PaginatedResponse } from './inventory';
export type { PaginatedResponse } from './inventory';

// ============ Types ============

export type AlertStatus = 'PENDING' | 'ACKNOWLEDGED' | 'PO_CREATED' | 'RESOLVED' | 'IGNORED';

export interface ReorderSettings {
  id: string;
  itemId: string;
  warehouseId?: string;
  reorderLevel: number;
  reorderQuantity: number;
  safetyStock: number;
  leadTimeDays: number;
  preferredVendorId?: string;
  autoReorder: boolean;
  isActive: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReorderSettingsResponse {
  item: {
    id: string;
    sku: string;
    name: string;
    reorderLevel: number;
    reorderQty: number;
  };
  settings: ReorderSettings[];
}

export interface ReorderSuggestion {
  itemId: string;
  sku: string;
  name: string;
  unit: string;
  currentStock: number;
  availableStock: number;
  reorderLevel: number;
  suggestedQty: number;
  costPrice: number;
  estimatedCost: number;
  preferredVendor: {
    id: string;
    displayName: string;
    companyName: string;
  } | null;
  stockLevels: {
    warehouseId: string;
    warehouse: { id: string; name: string; code: string };
    stockOnHand: number;
    committedStock: number;
  }[];
}

export interface ReorderAlert {
  id: string;
  itemId: string;
  warehouseId: string;
  currentStock: number;
  reorderLevel: number;
  suggestedQty: number;
  status: AlertStatus;
  purchaseOrderId?: string;
  notifiedAt?: string;
  resolvedAt?: string;
  organizationId: string;
  createdAt: string;
  item?: {
    id: string;
    sku: string;
    name: string;
    unit: string;
  };
  warehouse?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface AlertQueryParams {
  status?: AlertStatus;
  itemId?: string;
  page?: number;
  limit?: number;
}

export interface DemandForecast {
  item: {
    id: string;
    sku: string;
    name: string;
  };
  historicalData: {
    period: string;
    quantity: number;
  }[];
  forecasts: {
    period: string;
    forecastQty: number;
    method: string;
    confidence: number;
  }[];
  method: string;
  windowSize: number;
}

export interface ReorderReport {
  summary: {
    itemsBelowReorder: number;
    pendingAlerts: number;
    acknowledgedAlerts: number;
    poCreatedAlerts: number;
    autoReorderActive: number;
  };
  itemsBelowReorder: ReorderSuggestion[];
  stockCoverage: {
    itemId: string;
    sku: string;
    name: string;
    currentStock: number;
    reorderLevel: number;
    avgDailyDemand: number;
    coverageDays: number;
  }[];
}

export interface UpdateReorderSettingsDto {
  warehouseId?: string;
  reorderLevel?: number;
  reorderQuantity?: number;
  safetyStock?: number;
  leadTimeDays?: number;
  preferredVendorId?: string;
  autoReorder?: boolean;
  isActive?: boolean;
}

export interface BulkReorderSettingsDto {
  items: (UpdateReorderSettingsDto & { itemId: string })[];
}

// ============ Service ============

export const reorderService = {
  // Settings
  async getReorderSettings(itemId: string): Promise<ReorderSettingsResponse> {
    const response = await api.get(`/inventory/reorder-settings/${itemId}`);
    return response.data;
  },

  async updateReorderSettings(
    itemId: string,
    data: UpdateReorderSettingsDto
  ): Promise<ReorderSettings> {
    const response = await api.put(`/inventory/reorder-settings/${itemId}`, data);
    return response.data;
  },

  async bulkUpdateReorderSettings(data: BulkReorderSettingsDto): Promise<{ updated: number }> {
    const response = await api.put('/inventory/reorder-settings/bulk', data);
    return response.data;
  },

  // Suggestions & Alerts
  async getReorderSuggestions(): Promise<ReorderSuggestion[]> {
    const response = await api.get('/inventory/reorder-suggestions');
    return response.data;
  },

  async checkReorderPoints(): Promise<{ checked: number; newAlerts: number }> {
    const response = await api.post('/inventory/check-reorder');
    return response.data;
  },

  async createAutoReorderPO(
    alertId: string,
    overrides?: { vendorId?: string; warehouseId?: string }
  ): Promise<Record<string, unknown>> {
    const response = await api.post(`/inventory/auto-reorder/${alertId}`, overrides || {});
    return response.data;
  },

  async bulkCreatePOs(alertIds: string[]): Promise<{ created: number; failed: number }> {
    const response = await api.post('/inventory/bulk-po', { alertIds });
    return response.data;
  },

  async getAlerts(params?: AlertQueryParams): Promise<PaginatedResponse<ReorderAlert>> {
    const response = await api.get('/inventory/reorder-alerts', { params });
    return response.data;
  },

  async acknowledgeAlert(alertId: string): Promise<ReorderAlert> {
    const response = await api.put(`/inventory/reorder-alerts/${alertId}/acknowledge`);
    return response.data;
  },

  async resolveAlert(alertId: string): Promise<ReorderAlert> {
    const response = await api.put(`/inventory/reorder-alerts/${alertId}/resolve`);
    return response.data;
  },

  // Forecast
  async getDemandForecast(itemId: string, periods?: number): Promise<DemandForecast> {
    const params = periods ? { periods } : {};
    const response = await api.get(`/inventory/demand-forecast/${itemId}`, { params });
    return response.data;
  },

  // Report
  async getReorderReport(): Promise<ReorderReport> {
    const response = await api.get('/reports/reorder');
    return response.data;
  },
};
