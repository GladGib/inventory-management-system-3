import { api } from './api';

// Types
export type PriceListType = 'SALES' | 'PURCHASE';
export type MarkupType = 'PERCENTAGE' | 'FIXED';
export type PriceListStatus = 'ACTIVE' | 'INACTIVE';

export interface PriceList {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  type: PriceListType;
  markupType: MarkupType;
  markupValue: number;
  isDefault: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  status: PriceListStatus;
  itemsCount: number;
  contactsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PriceListItem {
  id: string;
  priceListId: string;
  itemId: string;
  customPrice: number;
  minQuantity: number;
  createdAt: string;
  updatedAt: string;
  item?: {
    id: string;
    sku: string;
    name: string;
    sellingPrice: number;
    costPrice: number;
    unit: string;
  };
}

export interface PriceListDetail extends PriceList {
  items: PriceListItem[];
  contacts: Array<{
    id: string;
    displayName: string;
    companyName: string;
    type: string;
  }>;
}

export interface PriceListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: PriceListType;
  status?: PriceListStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PriceListsResponse {
  data: PriceList[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface CreatePriceListDto {
  name: string;
  description?: string;
  type: PriceListType;
  markupType: MarkupType;
  markupValue: number;
  isDefault?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface UpdatePriceListDto extends Partial<CreatePriceListDto> {
  status?: PriceListStatus;
}

export interface AddPriceListItemDto {
  itemId: string;
  customPrice: number;
  minQuantity: number;
}

export interface UpdatePriceListItemDto {
  customPrice: number;
  minQuantity: number;
}

export interface BulkPriceUpdateDto {
  adjustmentType: 'PERCENTAGE' | 'FIXED';
  adjustmentValue: number;
}

export interface EffectivePriceResult {
  itemId: string;
  itemName: string;
  standardPrice: number;
  effectivePrice: number;
  priceListId: string | null;
  priceListName: string | null;
  source: 'STANDARD' | 'PRICE_LIST_ITEM' | 'PRICE_LIST_MARKUP';
  minQuantity?: number;
  markupType?: string;
  markupValue?: number;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

// Service
export const priceListsService = {
  async getPriceLists(params?: PriceListQueryParams): Promise<PriceListsResponse> {
    const response = await api.get('/price-lists', { params });
    return response.data;
  },

  async getPriceList(id: string): Promise<PriceListDetail> {
    const response = await api.get(`/price-lists/${id}`);
    return response.data;
  },

  async createPriceList(data: CreatePriceListDto): Promise<PriceList> {
    const response = await api.post('/price-lists', data);
    return response.data;
  },

  async updatePriceList(id: string, data: UpdatePriceListDto): Promise<PriceList> {
    const response = await api.put(`/price-lists/${id}`, data);
    return response.data;
  },

  async deletePriceList(id: string): Promise<void> {
    await api.delete(`/price-lists/${id}`);
  },

  async addPriceListItems(
    priceListId: string,
    items: AddPriceListItemDto[]
  ): Promise<PriceListItem[]> {
    const response = await api.post(`/price-lists/${priceListId}/items`, { items });
    return response.data;
  },

  async updatePriceListItem(
    priceListId: string,
    itemId: string,
    data: UpdatePriceListItemDto
  ): Promise<PriceListItem> {
    const response = await api.put(`/price-lists/${priceListId}/items/${itemId}`, data);
    return response.data;
  },

  async removePriceListItem(priceListId: string, itemId: string): Promise<void> {
    await api.delete(`/price-lists/${priceListId}/items/${itemId}`);
  },

  async getEffectivePrice(
    itemId: string,
    contactId?: string,
    quantity?: number
  ): Promise<EffectivePriceResult> {
    const response = await api.get('/price-lists/effective-price', {
      params: { itemId, contactId, quantity },
    });
    return response.data;
  },

  async bulkUpdatePrices(
    priceListId: string,
    data: BulkPriceUpdateDto
  ): Promise<{ updated: number }> {
    const response = await api.post(`/price-lists/${priceListId}/bulk-update`, data);
    return response.data;
  },

  async importItems(
    priceListId: string,
    data: Array<{ sku: string; customPrice: number; minQuantity?: number }>
  ): Promise<ImportResult> {
    const response = await api.post(`/price-lists/${priceListId}/import`, { data });
    return response.data;
  },
};
