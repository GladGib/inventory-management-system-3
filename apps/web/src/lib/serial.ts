import { api } from './api';
import { PaginatedResponse } from './inventory';

// Types
export type SerialStatus =
  | 'IN_STOCK'
  | 'SOLD'
  | 'RETURNED'
  | 'DAMAGED'
  | 'DEFECTIVE'
  | 'IN_REPAIR'
  | 'SCRAPPED'
  | 'IN_TRANSIT';

export type SerialAction =
  | 'RECEIVED'
  | 'SOLD'
  | 'RETURNED'
  | 'TRANSFERRED'
  | 'ADJUSTED'
  | 'REPAIRED'
  | 'SCRAPPED';

export type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'RESOLVED';

export interface Serial {
  id: string;
  itemId: string;
  serialNumber: string;
  warehouseId: string | null;
  status: SerialStatus;
  soldToId: string | null;
  purchaseReceiveId: string | null;
  purchaseDate: string | null;
  purchaseCost: number | null;
  supplierId: string | null;
  saleDate: string | null;
  warrantyMonths: number | null;
  warrantyStartDate: string | null;
  warrantyEndDate: string | null;
  notes: string | null;
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
  } | null;
  soldTo: {
    id: string;
    displayName: string;
    email?: string;
    phone?: string;
  } | null;
}

export interface SerialHistory {
  id: string;
  serialNumberId: string;
  action: SerialAction;
  fromStatus: SerialStatus | null;
  toStatus: SerialStatus;
  fromWarehouseId: string | null;
  toWarehouseId: string | null;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdById: string | null;
  createdAt: string;
}

export interface SerialDetail extends Serial {
  history: SerialHistory[];
  warrantyClaims: WarrantyClaim[];
}

export interface WarrantyClaim {
  id: string;
  claimNumber: string;
  serialNumberId: string;
  customerId: string;
  claimDate: string;
  issueDescription: string;
  status: ClaimStatus;
  resolution: string | null;
  resolvedDate: string | null;
  replacementSerialId: string | null;
  organizationId: string;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  serialNumber?: {
    serialNumber: string;
    item: {
      id: string;
      sku: string;
      name: string;
    };
    soldTo: {
      id: string;
      displayName: string;
    } | null;
  };
}

export interface SerialQueryParams {
  itemId?: string;
  warehouseId?: string;
  status?: SerialStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateBulkSerialsDto {
  itemId?: string;
  warehouseId: string;
  serialNumbers: string[];
  purchaseReceiveId?: string;
  supplierId?: string;
  purchaseCost?: number;
  warrantyMonths?: number;
}

export interface UpdateSerialDto {
  warehouseId?: string;
  status?: SerialStatus;
  notes?: string;
  warrantyMonths?: number;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
}

export interface AssignSerialsDto {
  serialIds: string[];
  salesOrderItemId?: string;
  customerId: string;
}

export interface CreateWarrantyClaimDto {
  customerId: string;
  claimDate: string;
  issueDescription: string;
}

export interface UpdateWarrantyClaimDto {
  status?: ClaimStatus;
  resolution?: string;
  resolvedDate?: string;
  replacementSerialId?: string;
}

export interface WarrantyClaimQueryParams {
  status?: ClaimStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface WarrantyReport {
  summary: {
    activeWarranties: number;
    expiringWithin30Days: number;
    claimsByStatus: Record<string, number>;
  };
  serials: (Serial & { daysUntilExpiry: number | null })[];
}

// Service
export const serialService = {
  // Item-scoped
  async listSerialsForItem(
    itemId: string,
    params?: Omit<SerialQueryParams, 'itemId'>
  ): Promise<PaginatedResponse<Serial>> {
    const response = await api.get(`/items/${itemId}/serials`, { params });
    return response.data;
  },

  async registerSerialsForItem(
    itemId: string,
    data: CreateBulkSerialsDto
  ): Promise<{ created: number; serials: Serial[] }> {
    const response = await api.post(`/items/${itemId}/serials`, data);
    return response.data;
  },

  // All org serials
  async listSerials(params?: SerialQueryParams): Promise<PaginatedResponse<Serial>> {
    const response = await api.get('/inventory/serials', { params });
    return response.data;
  },

  // Serial detail
  async getSerial(id: string): Promise<SerialDetail> {
    const response = await api.get(`/serials/${id}`);
    return response.data;
  },

  async updateSerial(id: string, data: UpdateSerialDto): Promise<Serial> {
    const response = await api.put(`/serials/${id}`, data);
    return response.data;
  },

  async getSerialHistory(id: string): Promise<SerialHistory[]> {
    const response = await api.get(`/serials/${id}/history`);
    return response.data;
  },

  // Search
  async searchSerials(query: string): Promise<Serial[]> {
    const response = await api.get('/serials/search', {
      params: { q: query },
    });
    return response.data;
  },

  // Available for sale
  async getAvailableSerials(itemId: string, warehouseId: string): Promise<Serial[]> {
    const response = await api.get('/serials/available', {
      params: { itemId, warehouseId },
    });
    return response.data;
  },

  // Assignment
  async assignSerials(data: AssignSerialsDto): Promise<{ assigned: number }> {
    const response = await api.post('/serials/assign', data);
    return response.data;
  },

  // Warranty claims
  async createWarrantyClaim(
    serialId: string,
    data: CreateWarrantyClaimDto
  ): Promise<WarrantyClaim> {
    const response = await api.post(`/serials/${serialId}/warranty-claim`, data);
    return response.data;
  },

  async getWarrantyClaims(
    params?: WarrantyClaimQueryParams
  ): Promise<PaginatedResponse<WarrantyClaim>> {
    const response = await api.get('/warranty-claims', { params });
    return response.data;
  },

  async updateWarrantyClaim(id: string, data: UpdateWarrantyClaimDto): Promise<WarrantyClaim> {
    const response = await api.put(`/warranty-claims/${id}`, data);
    return response.data;
  },

  // Reports
  async getWarrantyReport(): Promise<WarrantyReport> {
    const response = await api.get('/reports/serials/warranty');
    return response.data;
  },
};
