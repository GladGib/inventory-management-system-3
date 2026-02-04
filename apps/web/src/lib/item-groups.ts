import { api } from './api';

// Types
export interface Attribute {
  name: string;
  values: string[];
}

export interface ItemGroup {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  attributes: Attribute[];
  status: 'ACTIVE' | 'INACTIVE';
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ItemGroupWithItems extends ItemGroup {
  items: ItemGroupVariant[];
}

export interface ItemGroupVariant {
  id: string;
  sku: string;
  name: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  totalStock: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ItemGroupsResponse {
  data: ItemGroup[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface ItemGroupQueryParams {
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  page?: number;
  limit?: number;
}

export interface CreateItemGroupDto {
  name: string;
  description?: string;
  attributes: Attribute[];
}

export interface UpdateItemGroupDto extends Partial<CreateItemGroupDto> {
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface GenerateVariantsDto {
  baseSku: string;
  baseName: string;
  description?: string;
  unit?: string;
  baseCostPrice?: number;
  baseSellingPrice?: number;
  categoryId?: string;
}

export interface GenerateVariantsResult {
  created: number;
  skipped: number;
  items: ItemGroupVariant[];
}

// Service
export const itemGroupsService = {
  async getItemGroups(params?: ItemGroupQueryParams): Promise<ItemGroupsResponse> {
    const response = await api.get<ItemGroupsResponse>('/item-groups', { params });
    return response.data;
  },

  async getItemGroup(id: string): Promise<ItemGroupWithItems> {
    const response = await api.get<ItemGroupWithItems>(`/item-groups/${id}`);
    return response.data;
  },

  async createItemGroup(data: CreateItemGroupDto): Promise<ItemGroup> {
    const response = await api.post<ItemGroup>('/item-groups', data);
    return response.data;
  },

  async updateItemGroup(id: string, data: UpdateItemGroupDto): Promise<ItemGroup> {
    const response = await api.put<ItemGroup>(`/item-groups/${id}`, data);
    return response.data;
  },

  async deleteItemGroup(id: string): Promise<void> {
    await api.delete(`/item-groups/${id}`);
  },

  async generateVariants(
    groupId: string,
    data: GenerateVariantsDto
  ): Promise<GenerateVariantsResult> {
    const response = await api.post<GenerateVariantsResult>(
      `/item-groups/${groupId}/variants`,
      data
    );
    return response.data;
  },

  async removeVariant(groupId: string, variantId: string): Promise<void> {
    await api.delete(`/item-groups/${groupId}/variants/${variantId}`);
  },

  async bulkUpdateVariants(
    groupId: string,
    updates: Array<{ variantId: string; costPrice?: number; sellingPrice?: number }>
  ): Promise<{ updated: number; items: ItemGroupVariant[] }> {
    const response = await api.put<{ updated: number; items: ItemGroupVariant[] }>(
      `/item-groups/${groupId}/variants/bulk`,
      updates
    );
    return response.data;
  },
};

// Utility function to generate all attribute combinations
export function generateCombinations(attributes: Attribute[]): Record<string, string>[] {
  if (attributes.length === 0) return [{}];

  const [first, ...rest] = attributes;
  const restCombinations = generateCombinations(rest);

  const combinations: Record<string, string>[] = [];
  for (const value of first.values) {
    for (const restCombo of restCombinations) {
      combinations.push({ [first.name]: value, ...restCombo });
    }
  }

  return combinations;
}

// Utility function to count total possible variants
export function countPossibleVariants(attributes: Attribute[]): number {
  if (attributes.length === 0) return 0;
  return attributes.reduce((total, attr) => total * attr.values.length, 1);
}
