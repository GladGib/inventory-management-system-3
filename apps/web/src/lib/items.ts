import { api } from './api';

// ============ Types ============

export type ItemType = 'INVENTORY' | 'SERVICE' | 'NON_INVENTORY' | 'COMPOSITE';
export type ItemStatus = 'ACTIVE' | 'INACTIVE';

export interface CrossReference {
  id: string;
  itemId: string;
  oemNumber: string;
  aftermarketNumber?: string | null;
  brand?: string | null;
  notes?: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCrossReferenceDto {
  oemNumber: string;
  aftermarketNumber?: string;
  brand?: string;
  notes?: string;
}

export interface UpdateCrossReferenceDto {
  oemNumber?: string;
  aftermarketNumber?: string;
  brand?: string;
  notes?: string;
}

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
  hasCore: boolean;
  coreCharge?: number;
  coreItemId?: string;
  coreItem?: {
    id: string;
    sku: string;
    name: string;
  };
  status: ItemStatus;
  stockOnHand: number;
  committedStock: number;
  availableStock: number;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PartNumberSearchResult extends Item {
  matchedOn: string[];
}

export interface PartNumberSearchResponse {
  data: PartNumberSearchResult[];
  meta: {
    total: number;
  };
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
  hasCore?: boolean;
  coreCharge?: number;
  coreItemId?: string;
  openingStock?: number;
  openingStockWarehouseId?: string;
}

export interface UpdateItemDto extends Partial<
  Omit<CreateItemDto, 'openingStock' | 'openingStockWarehouseId'>
> {
  status?: ItemStatus;
}

// ============ Barcode Types ============

export interface BarcodeResponse {
  svg: string;
}

export interface BatchBarcodeItem {
  itemId: string;
  sku: string;
  name: string;
  sellingPrice: number;
  svg: string;
}

export interface BatchBarcodeRequest {
  itemIds: string[];
  format?: string;
  labelTemplate?: string;
}

// ============ Supersession Types ============

export interface PartSupersession {
  id: string;
  oldItemId: string;
  newItemId: string;
  effectiveDate: string;
  reason?: string | null;
  oldItem?: { id: string; sku: string; name: string };
  newItem?: { id: string; sku: string; name: string };
}

export interface SupersessionChainNode {
  id: string;
  sku: string;
  name: string;
  effectiveDate?: string;
  reason?: string | null;
  isCurrent: boolean;
}

export interface SupersessionChainResponse {
  chain: SupersessionChainNode[];
  isSuperseded: boolean;
  supersededBy: { id: string; sku: string; name: string } | null;
}

export interface CreateSupersessionDto {
  newItemId: string;
  reason?: string;
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

  // ============ Cross-Reference Methods ============

  async getCrossReferences(itemId: string): Promise<CrossReference[]> {
    const response = await api.get<CrossReference[]>(`/items/${itemId}/cross-references`);
    return response.data;
  },

  async addCrossReference(itemId: string, data: CreateCrossReferenceDto): Promise<CrossReference> {
    const response = await api.post<CrossReference>(`/items/${itemId}/cross-references`, data);
    return response.data;
  },

  async updateCrossReference(crossRefId: string, data: UpdateCrossReferenceDto): Promise<CrossReference> {
    const response = await api.put<CrossReference>(`/items/cross-references/${crossRefId}`, data);
    return response.data;
  },

  async deleteCrossReference(crossRefId: string): Promise<void> {
    await api.delete(`/items/cross-references/${crossRefId}`);
  },

  async searchByPartNumber(query: string): Promise<PartNumberSearchResponse> {
    const response = await api.get<PartNumberSearchResponse>('/items/search/by-part-number', {
      params: { query },
    });
    return response.data;
  },

  // ============ Barcode Methods ============

  async getBarcode(
    itemId: string,
    options?: { format?: string; width?: number; height?: number },
  ): Promise<BarcodeResponse> {
    const response = await api.get<BarcodeResponse>(`/items/${itemId}/barcode`, {
      params: options,
    });
    return response.data;
  },

  async getBatchBarcodes(data: BatchBarcodeRequest): Promise<BatchBarcodeItem[]> {
    const response = await api.post<BatchBarcodeItem[]>('/items/barcode/batch', data);
    return response.data;
  },

  // ============ Supersession Methods ============

  async supersedeItem(
    itemId: string,
    data: CreateSupersessionDto,
  ): Promise<PartSupersession> {
    const response = await api.post<PartSupersession>(
      `/items/${itemId}/supersede`,
      data,
    );
    return response.data;
  },

  async getSupersessionChain(itemId: string): Promise<SupersessionChainResponse> {
    const response = await api.get<SupersessionChainResponse>(
      `/items/${itemId}/supersession-chain`,
    );
    return response.data;
  },
};
