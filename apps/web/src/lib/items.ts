import { api } from './api';

// ============ Types ============

export type ItemType = 'INVENTORY' | 'SERVICE' | 'NON_INVENTORY';
export type ItemStatus = 'ACTIVE' | 'INACTIVE';

export interface Item {
  id: string;
  sku: string;
  name: string;
  nameMalay?: string;
  description?: string;
  type: ItemType;
  unit: string;
  brand?: string;
  partNumber?: string;
  crossReferences?: string[];
  vehicleModels?: string[];
  categoryId?: string;
  category?: {
    id: string;
    name: string;
  };
  costPrice: number;
  sellingPrice: number;
  reorderLevel?: number;
  reorderQty?: number;
  taxable: boolean;
  taxRateId?: string;
  taxRate?: {
    id: string;
    name: string;
    rate: number;
  };
  trackInventory: boolean;
  trackBatches: boolean;
  trackSerials: boolean;
  status: ItemStatus;
  stockOnHand: number;
  committedStock: number;
  availableStock: number;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ItemWithDetails extends Item {
  stockLevels: {
    warehouseId: string;
    warehouse: {
      id: string;
      name: string;
      code: string;
    };
    stockOnHand: number;
    committedStock: number;
  }[];
  stockValue: number;
  group?: {
    id: string;
    name: string;
  };
}

export interface ItemQueryParams {
  search?: string;
  type?: ItemType;
  status?: ItemStatus;
  categoryId?: string;
  brand?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ItemsResponse {
  data: Item[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface CreateItemDto {
  sku: string;
  name: string;
  nameMalay?: string;
  description?: string;
  type: ItemType;
  unit: string;
  brand?: string;
  partNumber?: string;
  crossReferences?: string[];
  vehicleModels?: string[];
  categoryId?: string;
  costPrice: number;
  sellingPrice: number;
  reorderLevel?: number;
  reorderQty?: number;
  taxable?: boolean;
  taxRateId?: string;
  trackInventory?: boolean;
  trackBatches?: boolean;
  trackSerials?: boolean;
  openingStock?: number;
  openingStockWarehouseId?: string;
}

export interface UpdateItemDto extends Partial<
  Omit<CreateItemDto, 'openingStock' | 'openingStockWarehouseId'>
> {
  status?: ItemStatus;
}

// ============ Service ============

export const itemsService = {
  async getItems(params?: ItemQueryParams): Promise<ItemsResponse> {
    const response = await api.get<ItemsResponse>('/items', { params });
    return response.data;
  },

  async getItem(id: string): Promise<ItemWithDetails> {
    const response = await api.get<ItemWithDetails>(`/items/${id}`);
    return response.data;
  },

  async getLowStockItems(): Promise<Item[]> {
    const response = await api.get<Item[]>('/items/low-stock');
    return response.data;
  },

  async createItem(data: CreateItemDto): Promise<Item> {
    const response = await api.post<Item>('/items', data);
    return response.data;
  },

  async updateItem(id: string, data: UpdateItemDto): Promise<Item> {
    const response = await api.put<Item>(`/items/${id}`, data);
    return response.data;
  },

  async deleteItem(id: string): Promise<void> {
    await api.delete(`/items/${id}`);
  },
};
