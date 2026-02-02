import { api } from './api';

// Types
export interface StockLevel {
  id: string;
  itemId: string;
  warehouseId: string;
  stockOnHand: number;
  committedStock: number;
  incomingStock: number;
  updatedAt: string;
  item: {
    id: string;
    sku: string;
    name: string;
    costPrice: number;
    reorderLevel: number;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  availableStock: number;
  stockValue: number;
  isLowStock: boolean;
}

export interface StockQueryParams {
  warehouseId?: string;
  itemId?: string;
  lowStockOnly?: boolean;
}

export interface Warehouse {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  isDefault: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  totalItems: number;
  totalStockOnHand: number;
  totalStockValue: number;
}

// Service
export const inventoryService = {
  async getStockLevels(params?: StockQueryParams): Promise<StockLevel[]> {
    const response = await api.get('/inventory/stock', { params });
    return response.data;
  },

  async getStockByItem(itemId: string): Promise<StockLevel[]> {
    const response = await api.get(`/inventory/stock/${itemId}`);
    return response.data;
  },

  async getWarehouses(): Promise<Warehouse[]> {
    const response = await api.get('/warehouses');
    return response.data;
  },

  async getWarehouse(id: string): Promise<Warehouse> {
    const response = await api.get(`/warehouses/${id}`);
    return response.data;
  },
};
