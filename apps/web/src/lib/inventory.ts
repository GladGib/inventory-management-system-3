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

// Adjustment Types
export type AdjustmentReason =
  | 'OPENING_STOCK'
  | 'DAMAGE'
  | 'LOSS'
  | 'RETURN'
  | 'FOUND'
  | 'CORRECTION'
  | 'OTHER';

export interface AdjustmentItem {
  id: string;
  itemId: string;
  item: {
    id: string;
    sku: string;
    name: string;
    unit: string;
  };
  quantity: number;
  reason: AdjustmentReason;
  notes?: string;
}

export interface InventoryAdjustment {
  id: string;
  adjustmentNumber: string;
  warehouseId: string;
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  adjustmentDate: string;
  status: 'COMPLETED';
  notes?: string;
  items: AdjustmentItem[];
  createdById: string;
  createdBy?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export interface AdjustmentQueryParams {
  warehouseId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateAdjustmentItemDto {
  itemId: string;
  quantity: number;
  reason: AdjustmentReason;
  notes?: string;
}

export interface CreateAdjustmentDto {
  warehouseId: string;
  adjustmentDate?: Date;
  notes?: string;
  items: CreateAdjustmentItemDto[];
}

// Transfer Types
export type TransferStatus = 'DRAFT' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export interface TransferItem {
  id: string;
  itemId: string;
  item: {
    id: string;
    sku: string;
    name: string;
    unit: string;
  };
  quantity: number;
  receivedQty?: number;
}

export interface InventoryTransfer {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  sourceWarehouse: {
    id: string;
    name: string;
    code: string;
  };
  destinationWarehouseId: string;
  destinationWarehouse: {
    id: string;
    name: string;
    code: string;
  };
  transferDate: string;
  status: TransferStatus;
  notes?: string;
  items: TransferItem[];
  createdById: string;
  createdBy?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export interface TransferQueryParams {
  warehouseId?: string;
  status?: TransferStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateTransferItemDto {
  itemId: string;
  quantity: number;
}

export interface CreateTransferDto {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  transferDate?: Date;
  notes?: string;
  items: CreateTransferItemDto[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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

  // Adjustments
  async getAdjustments(
    params?: AdjustmentQueryParams
  ): Promise<PaginatedResponse<InventoryAdjustment>> {
    const response = await api.get('/inventory/adjustments', { params });
    return response.data;
  },

  async getAdjustment(id: string): Promise<InventoryAdjustment> {
    const response = await api.get(`/inventory/adjustments/${id}`);
    return response.data;
  },

  async createAdjustment(data: CreateAdjustmentDto): Promise<InventoryAdjustment> {
    const response = await api.post('/inventory/adjustments', data);
    return response.data;
  },

  // Transfers
  async getTransfers(params?: TransferQueryParams): Promise<PaginatedResponse<InventoryTransfer>> {
    const response = await api.get('/inventory/transfers', { params });
    return response.data;
  },

  async getTransfer(id: string): Promise<InventoryTransfer> {
    const response = await api.get(`/inventory/transfers/${id}`);
    return response.data;
  },

  async createTransfer(data: CreateTransferDto): Promise<InventoryTransfer> {
    const response = await api.post('/inventory/transfers', data);
    return response.data;
  },

  async issueTransfer(id: string): Promise<InventoryTransfer> {
    const response = await api.put(`/inventory/transfers/${id}/issue`);
    return response.data;
  },

  async receiveTransfer(id: string): Promise<InventoryTransfer> {
    const response = await api.put(`/inventory/transfers/${id}/receive`);
    return response.data;
  },

  async cancelTransfer(id: string): Promise<InventoryTransfer> {
    const response = await api.put(`/inventory/transfers/${id}/cancel`);
    return response.data;
  },
};
