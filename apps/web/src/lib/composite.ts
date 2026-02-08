import { api } from './api';
import type { PaginatedResponse } from './inventory';
export type { PaginatedResponse } from './inventory';

// ============ Types ============

export interface BOMComponent {
  id: string;
  compositeItemId: string;
  componentItemId: string;
  componentItem: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    costPrice: number;
  };
  quantity: number;
  notes?: string;
  sortOrder: number;
}

export interface CompositeItem {
  id: string;
  itemId: string;
  item: {
    id: string;
    sku: string;
    name: string;
    costPrice: number;
    sellingPrice: number;
    unit?: string;
  };
  assemblyMethod: 'MANUAL' | 'ON_SALE';
  organizationId: string;
  components: BOMComponent[];
  createdAt: string;
  updatedAt: string;
}

export interface BOMAvailability {
  availableQty: number;
  limitingComponent: {
    id: string;
    sku: string;
    name: string;
    unit: string;
  } | null;
  components: {
    componentItemId: string;
    componentItem: {
      id: string;
      sku: string;
      name: string;
      unit: string;
    };
    requiredPerUnit: number;
    availableStock: number;
    canBuild: number;
  }[];
}

export interface BOMCost {
  componentCosts: {
    componentItemId: string;
    componentItem: {
      id: string;
      sku: string;
      name: string;
      costPrice: number;
      unit: string;
    };
    quantity: number;
    unitCost: number;
    totalCost: number;
  }[];
  totalComponentCost: number;
  sellingPrice: number;
  margin: number;
}

export type AssemblyStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface AssemblyItem {
  id: string;
  assemblyId: string;
  itemId: string;
  requiredQty: number;
  consumedQty: number;
  unitCost: number;
  totalCost: number;
}

export interface Assembly {
  id: string;
  assemblyNumber: string;
  compositeItemId: string;
  compositeItem: {
    id: string;
    item: {
      id: string;
      sku: string;
      name: string;
      unit?: string;
    };
  };
  quantity: number;
  warehouseId: string;
  status: AssemblyStatus;
  assemblyDate: string;
  totalCost: number;
  notes?: string;
  organizationId: string;
  createdById?: string;
  items: AssemblyItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AssemblyQueryParams {
  status?: AssemblyStatus;
  compositeItemId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateCompositeDto {
  itemId: string;
  assemblyMethod?: 'MANUAL' | 'ON_SALE';
  components: {
    componentItemId: string;
    quantity: number;
    notes?: string;
    sortOrder?: number;
  }[];
}

export interface UpdateBOMDto {
  assemblyMethod?: 'MANUAL' | 'ON_SALE';
  components: {
    componentItemId: string;
    quantity: number;
    notes?: string;
    sortOrder?: number;
  }[];
}

export interface CreateAssemblyDto {
  compositeItemId: string;
  quantity: number;
  warehouseId: string;
  assemblyDate?: string;
  notes?: string;
}

export interface CreateDisassemblyDto {
  compositeItemId: string;
  quantity: number;
  warehouseId: string;
  notes?: string;
}

// ============ Service ============

export const compositeService = {
  // BOM
  async createCompositeItem(data: CreateCompositeDto): Promise<CompositeItem> {
    const response = await api.post('/items/composite', data);
    return response.data;
  },

  async getBOM(itemId: string): Promise<CompositeItem> {
    const response = await api.get(`/items/${itemId}/bom`);
    return response.data;
  },

  async updateBOM(itemId: string, data: UpdateBOMDto): Promise<CompositeItem> {
    const response = await api.put(`/items/${itemId}/bom`, data);
    return response.data;
  },

  async getBOMAvailability(itemId: string, warehouseId?: string): Promise<BOMAvailability> {
    const params = warehouseId ? { warehouseId } : {};
    const response = await api.get(`/items/${itemId}/bom/availability`, { params });
    return response.data;
  },

  async getBOMCost(itemId: string): Promise<BOMCost> {
    const response = await api.get(`/items/${itemId}/bom/cost`);
    return response.data;
  },

  // Assemblies
  async createAssembly(data: CreateAssemblyDto): Promise<Assembly> {
    const response = await api.post('/inventory/assembly', data);
    return response.data;
  },

  async completeAssembly(id: string): Promise<Assembly> {
    const response = await api.put(`/inventory/assembly/${id}/complete`);
    return response.data;
  },

  async cancelAssembly(id: string): Promise<Assembly> {
    const response = await api.put(`/inventory/assembly/${id}/cancel`);
    return response.data;
  },

  async createDisassembly(data: CreateDisassemblyDto): Promise<Assembly> {
    const response = await api.post('/inventory/disassembly', data);
    return response.data;
  },

  async getAssemblies(params?: AssemblyQueryParams): Promise<PaginatedResponse<Assembly>> {
    const response = await api.get('/inventory/assemblies', { params });
    return response.data;
  },

  async getAssembly(id: string): Promise<Assembly> {
    const response = await api.get(`/inventory/assemblies/${id}`);
    return response.data;
  },
};
