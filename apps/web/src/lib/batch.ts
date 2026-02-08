import { api } from './api';
import { PaginatedResponse } from './inventory';

// Types
export type BatchStatus = 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'RECALLED';
export type BatchTransactionType =
  | 'RECEIVE'
  | 'SALE'
  | 'ADJUSTMENT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'RETURN'
  | 'WRITE_OFF';
export type AllocationMethod = 'FIFO' | 'FEFO';

export interface Batch {
  id: string;
  itemId: string;
  warehouseId: string;
  batchNumber: string;
  manufactureDate: string | null;
  expiryDate: string | null;
  quantity: number;
  initialQuantity: number;
  status: BatchStatus;
  notes: string | null;
  purchaseReceiveId: string | null;
  supplierId: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  item: {
    id: string;
    sku: string;
    name: string;
    unit?: string;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  daysUntilExpiry?: number;
  daysExpired?: number | null;
}

export interface BatchTransaction {
  id: string;
  batchId: string;
  type: BatchTransactionType;
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdById: string | null;
  createdAt: string;
}

export interface BatchDetail extends Batch {
  transactions: BatchTransaction[];
}

export interface BatchQueryParams {
  itemId?: string;
  warehouseId?: string;
  status?: BatchStatus;
  expiryFrom?: string;
  expiryTo?: string;
  page?: number;
  limit?: number;
}

export interface CreateBatchDto {
  itemId?: string;
  warehouseId: string;
  batchNumber: string;
  manufactureDate?: string;
  expiryDate?: string;
  quantity: number;
  notes?: string;
  purchaseReceiveId?: string;
  supplierId?: string;
}

export interface UpdateBatchDto {
  manufactureDate?: string;
  expiryDate?: string;
  notes?: string;
  status?: BatchStatus;
}

export interface BatchAdjustmentDto {
  batchId: string;
  quantity: number;
  reason: string;
  notes?: string;
}

export interface BatchAllocationDto {
  itemId: string;
  warehouseId: string;
  quantity: number;
  method?: AllocationMethod;
}

export interface BatchAllocation {
  batchId: string;
  batchNumber: string;
  allocatedQuantity: number;
  availableQuantity: number;
  expiryDate: string | null;
}

export interface BatchAllocationResult {
  method: AllocationMethod;
  totalAllocated: number;
  allocations: BatchAllocation[];
}

// Service
export const batchService = {
  // Item-scoped
  async listBatchesForItem(
    itemId: string,
    params?: Omit<BatchQueryParams, 'itemId'>
  ): Promise<PaginatedResponse<Batch>> {
    const response = await api.get(`/items/${itemId}/batches`, { params });
    return response.data;
  },

  async createBatchForItem(itemId: string, data: CreateBatchDto): Promise<Batch> {
    const response = await api.post(`/items/${itemId}/batches`, data);
    return response.data;
  },

  // All org batches
  async listBatches(params?: BatchQueryParams): Promise<PaginatedResponse<Batch>> {
    const response = await api.get('/inventory/batches', { params });
    return response.data;
  },

  // Batch detail
  async getBatch(id: string): Promise<BatchDetail> {
    const response = await api.get(`/batches/${id}`);
    return response.data;
  },

  async updateBatch(id: string, data: UpdateBatchDto): Promise<Batch> {
    const response = await api.put(`/batches/${id}`, data);
    return response.data;
  },

  async getBatchHistory(id: string): Promise<BatchTransaction[]> {
    const response = await api.get(`/batches/${id}/history`);
    return response.data;
  },

  // Reports
  async getExpiringBatches(days?: number): Promise<Batch[]> {
    const response = await api.get('/reports/batches/expiring', {
      params: { days },
    });
    return response.data;
  },

  async getExpiredBatches(): Promise<Batch[]> {
    const response = await api.get('/reports/batches/expired');
    return response.data;
  },

  // Adjustment
  async adjustBatch(data: BatchAdjustmentDto): Promise<Batch> {
    const response = await api.post('/inventory/adjustments/batch', data);
    return response.data;
  },

  // Allocation
  async allocateBatches(data: BatchAllocationDto): Promise<BatchAllocationResult> {
    const response = await api.post('/inventory/batches/allocate', data);
    return response.data;
  },
};
