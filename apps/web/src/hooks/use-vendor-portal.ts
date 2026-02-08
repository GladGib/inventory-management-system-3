import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  vendorPortalService,
  VendorDashboardSummary,
  VendorPOQueryParams,
  VendorBillQueryParams,
  VendorPaymentQueryParams,
  ConfirmPurchaseOrderDto,
  UpdateDeliveryStatusDto,
} from '@/lib/vendor-portal';
import type {
  PurchaseOrder,
  Bill,
  VendorPayment,
  PaginatedResponse,
} from '@/lib/purchases';

// Query keys
export const vendorPortalKeys = {
  all: ['vendor-portal'] as const,
  dashboard: () => [...vendorPortalKeys.all, 'dashboard'] as const,
  purchaseOrders: () => [...vendorPortalKeys.all, 'purchase-orders'] as const,
  purchaseOrderList: (params: VendorPOQueryParams) =>
    [...vendorPortalKeys.purchaseOrders(), 'list', params] as const,
  purchaseOrderDetail: (id: string) =>
    [...vendorPortalKeys.purchaseOrders(), 'detail', id] as const,
  bills: () => [...vendorPortalKeys.all, 'bills'] as const,
  billList: (params: VendorBillQueryParams) =>
    [...vendorPortalKeys.bills(), 'list', params] as const,
  billDetail: (id: string) =>
    [...vendorPortalKeys.bills(), 'detail', id] as const,
  payments: () => [...vendorPortalKeys.all, 'payments'] as const,
  paymentList: (params: VendorPaymentQueryParams) =>
    [...vendorPortalKeys.payments(), 'list', params] as const,
};

// ============ Dashboard ============

export function useVendorDashboard() {
  return useQuery<VendorDashboardSummary>({
    queryKey: vendorPortalKeys.dashboard(),
    queryFn: () => vendorPortalService.getDashboard(),
  });
}

// ============ Purchase Orders ============

export function useVendorPurchaseOrders(params?: VendorPOQueryParams) {
  return useQuery<PaginatedResponse<PurchaseOrder>>({
    queryKey: vendorPortalKeys.purchaseOrderList(params || {}),
    queryFn: () => vendorPortalService.getPurchaseOrders(params),
  });
}

export function useVendorPurchaseOrder(id: string) {
  return useQuery<PurchaseOrder>({
    queryKey: vendorPortalKeys.purchaseOrderDetail(id),
    queryFn: () => vendorPortalService.getPurchaseOrder(id),
    enabled: !!id,
  });
}

export function useConfirmPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConfirmPurchaseOrderDto }) =>
      vendorPortalService.confirmPurchaseOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: vendorPortalKeys.purchaseOrders(),
      });
      queryClient.invalidateQueries({
        queryKey: vendorPortalKeys.dashboard(),
      });
      message.success('Purchase order confirmed successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(
        error.response?.data?.message || 'Failed to confirm purchase order',
      );
    },
  });
}

export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateDeliveryStatusDto;
    }) => vendorPortalService.updateDeliveryStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: vendorPortalKeys.purchaseOrders(),
      });
      message.success('Delivery status updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(
        error.response?.data?.message || 'Failed to update delivery status',
      );
    },
  });
}

// ============ Bills ============

export function useVendorBills(params?: VendorBillQueryParams) {
  return useQuery<PaginatedResponse<Bill>>({
    queryKey: vendorPortalKeys.billList(params || {}),
    queryFn: () => vendorPortalService.getBills(params),
  });
}

export function useVendorBill(id: string) {
  return useQuery<Bill>({
    queryKey: vendorPortalKeys.billDetail(id),
    queryFn: () => vendorPortalService.getBill(id),
    enabled: !!id,
  });
}

// ============ Payments ============

export function useVendorPayments(params?: VendorPaymentQueryParams) {
  return useQuery<PaginatedResponse<VendorPayment>>({
    queryKey: vendorPortalKeys.paymentList(params || {}),
    queryFn: () => vendorPortalService.getPayments(params),
  });
}
