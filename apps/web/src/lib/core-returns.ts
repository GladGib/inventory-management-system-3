import { api } from './api';

// ============ Types ============

export type CoreReturnStatus = 'PENDING' | 'RECEIVED' | 'CREDITED' | 'REJECTED';

export interface CoreReturn {
  id: string;
  returnNumber: string;
  customerId: string;
  customer: {
    id: string;
    displayName: string;
    companyName?: string;
  };
  itemId: string;
  item: {
    id: string;
    sku: string;
    name: string;
    hasCore?: boolean;
    coreCharge?: number;
    unit?: string;
  };
  salesOrderId?: string;
  invoiceId?: string;
  coreCharge: number;
  returnDate?: string;
  dueDate: string;
  status: CoreReturnStatus;
  notes?: string;
  organizationId: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoreReturnQueryParams {
  status?: CoreReturnStatus;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
  overdue?: string;
  page?: number;
  limit?: number;
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

export interface CreateCoreReturnDto {
  customerId: string;
  itemId: string;
  salesOrderId?: string;
  invoiceId?: string;
  coreCharge: number;
  dueDate?: string;
  notes?: string;
}

export interface ActionDto {
  notes?: string;
}

// ============ Service ============

export const coreReturnsService = {
  async getCoreReturns(
    params?: CoreReturnQueryParams,
  ): Promise<PaginatedResponse<CoreReturn>> {
    const response = await api.get<PaginatedResponse<CoreReturn>>(
      '/sales/core-returns',
      { params },
    );
    return response.data;
  },

  async getCoreReturn(id: string): Promise<CoreReturn> {
    const response = await api.get<CoreReturn>(`/sales/core-returns/${id}`);
    return response.data;
  },

  async createCoreReturn(data: CreateCoreReturnDto): Promise<CoreReturn> {
    const response = await api.post<CoreReturn>('/sales/core-returns', data);
    return response.data;
  },

  async receiveCoreReturn(id: string, data?: ActionDto): Promise<CoreReturn> {
    const response = await api.put<CoreReturn>(
      `/sales/core-returns/${id}/receive`,
      data || {},
    );
    return response.data;
  },

  async creditCoreReturn(id: string, data?: ActionDto): Promise<CoreReturn> {
    const response = await api.put<CoreReturn>(
      `/sales/core-returns/${id}/credit`,
      data || {},
    );
    return response.data;
  },

  async rejectCoreReturn(id: string, data?: ActionDto): Promise<CoreReturn> {
    const response = await api.put<CoreReturn>(
      `/sales/core-returns/${id}/reject`,
      data || {},
    );
    return response.data;
  },

  async getCustomerPendingCoreReturns(
    customerId: string,
  ): Promise<CoreReturn[]> {
    const response = await api.get<CoreReturn[]>(
      `/sales/core-returns/customer/${customerId}`,
    );
    return response.data;
  },

  async getOverdueCount(): Promise<{ count: number }> {
    const response = await api.get<{ count: number }>(
      '/sales/core-returns/overdue-count',
    );
    return response.data;
  },
};
