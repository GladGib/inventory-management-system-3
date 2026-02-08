import { api } from './api';
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
  Bill,
  BillStatus,
  VendorPayment,
  PaginatedResponse,
} from './purchases';

// ============ Types ============

export interface VendorDashboardSummary {
  pendingPOs: PurchaseOrder[];
  totalActivePOs: number;
  openBills: Bill[];
  totalBilledAmount: number;
  totalPaidAmount: number;
  recentPayments: VendorPayment[];
}

export interface VendorPOQueryParams {
  status?: PurchaseOrderStatus;
  page?: number;
  limit?: number;
}

export interface VendorBillQueryParams {
  status?: BillStatus;
  page?: number;
  limit?: number;
}

export interface VendorPaymentQueryParams {
  page?: number;
  limit?: number;
}

export interface ConfirmPurchaseOrderDto {
  confirmedDate: string;
  notes?: string;
}

export interface UpdateDeliveryStatusDto {
  expectedDeliveryDate: string;
  trackingNumber?: string;
  notes?: string;
}

// ============ Service ============

export const vendorPortalService = {
  // Dashboard
  async getDashboard(): Promise<VendorDashboardSummary> {
    const response = await api.get<VendorDashboardSummary>(
      '/portal/vendor/dashboard',
    );
    return response.data;
  },

  // Purchase Orders
  async getPurchaseOrders(
    params?: VendorPOQueryParams,
  ): Promise<PaginatedResponse<PurchaseOrder>> {
    const response = await api.get<PaginatedResponse<PurchaseOrder>>(
      '/portal/vendor/purchase-orders',
      { params },
    );
    return response.data;
  },

  async getPurchaseOrder(id: string): Promise<PurchaseOrder> {
    const response = await api.get<PurchaseOrder>(
      `/portal/vendor/purchase-orders/${id}`,
    );
    return response.data;
  },

  async confirmPurchaseOrder(
    id: string,
    data: ConfirmPurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    const response = await api.patch<PurchaseOrder>(
      `/portal/vendor/purchase-orders/${id}/confirm`,
      data,
    );
    return response.data;
  },

  async updateDeliveryStatus(
    id: string,
    data: UpdateDeliveryStatusDto,
  ): Promise<PurchaseOrder> {
    const response = await api.patch<PurchaseOrder>(
      `/portal/vendor/purchase-orders/${id}/delivery`,
      data,
    );
    return response.data;
  },

  // Bills
  async getBills(
    params?: VendorBillQueryParams,
  ): Promise<PaginatedResponse<Bill>> {
    const response = await api.get<PaginatedResponse<Bill>>(
      '/portal/vendor/bills',
      { params },
    );
    return response.data;
  },

  async getBill(id: string): Promise<Bill> {
    const response = await api.get<Bill>(`/portal/vendor/bills/${id}`);
    return response.data;
  },

  // Payments
  async getPayments(
    params?: VendorPaymentQueryParams,
  ): Promise<PaginatedResponse<VendorPayment>> {
    const response = await api.get<PaginatedResponse<VendorPayment>>(
      '/portal/vendor/payments',
      { params },
    );
    return response.data;
  },
};
