import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  purchasesService,
  PurchaseOrder,
  Bill,
  VendorPayment,
  PurchaseReceive,
  PurchaseOrderQueryParams,
  BillQueryParams,
  PaymentQueryParams,
  ReceiveQueryParams,
  PaginatedResponse,
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  CreateBillDto,
  CreateVendorPaymentDto,
  CreateReceiveDto,
} from '@/lib/purchases';

// Query keys
export const purchaseKeys = {
  all: ['purchases'] as const,
  orders: () => [...purchaseKeys.all, 'orders'] as const,
  orderList: (params: PurchaseOrderQueryParams) =>
    [...purchaseKeys.orders(), 'list', params] as const,
  orderDetail: (id: string) => [...purchaseKeys.orders(), 'detail', id] as const,
  receives: () => [...purchaseKeys.all, 'receives'] as const,
  receiveList: (params: ReceiveQueryParams) =>
    [...purchaseKeys.receives(), 'list', params] as const,
  bills: () => [...purchaseKeys.all, 'bills'] as const,
  billList: (params: BillQueryParams) => [...purchaseKeys.bills(), 'list', params] as const,
  billDetail: (id: string) => [...purchaseKeys.bills(), 'detail', id] as const,
  payments: () => [...purchaseKeys.all, 'payments'] as const,
  paymentList: (params: PaymentQueryParams) =>
    [...purchaseKeys.payments(), 'list', params] as const,
};

// ============ Purchase Orders ============

export function usePurchaseOrders(params?: PurchaseOrderQueryParams) {
  return useQuery<PaginatedResponse<PurchaseOrder>>({
    queryKey: purchaseKeys.orderList(params || {}),
    queryFn: () => purchasesService.getOrders(params),
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery<PurchaseOrder>({
    queryKey: purchaseKeys.orderDetail(id),
    queryFn: () => purchasesService.getOrder(id),
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePurchaseOrderDto) => purchasesService.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.orders() });
      message.success('Purchase order created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create purchase order');
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePurchaseOrderDto }) =>
      purchasesService.updateOrder(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.orders() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.orderDetail(id) });
      message.success('Purchase order updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update purchase order');
    },
  });
}

export function useIssuePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchasesService.issueOrder(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.orders() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.orderDetail(id) });
      message.success('Purchase order issued');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to issue purchase order');
    },
  });
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchasesService.cancelOrder(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.orders() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.orderDetail(id) });
      message.success('Purchase order cancelled');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to cancel purchase order');
    },
  });
}

export function useCreateBillFromOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => purchasesService.createBillFromOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.orders() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.bills() });
      message.success('Bill created from purchase order');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create bill');
    },
  });
}

// ============ Receives ============

export function usePurchaseReceives(params?: ReceiveQueryParams) {
  return useQuery<PaginatedResponse<PurchaseReceive>>({
    queryKey: purchaseKeys.receiveList(params || {}),
    queryFn: () => purchasesService.getReceives(params),
  });
}

export function useCreateReceive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReceiveDto) => purchasesService.createReceive(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.receives() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.orders() });
      message.success('Goods received successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to record receive');
    },
  });
}

// ============ Bills ============

export function useBills(params?: BillQueryParams) {
  return useQuery<PaginatedResponse<Bill>>({
    queryKey: purchaseKeys.billList(params || {}),
    queryFn: () => purchasesService.getBills(params),
  });
}

export function useBill(id: string) {
  return useQuery<Bill>({
    queryKey: purchaseKeys.billDetail(id),
    queryFn: () => purchasesService.getBill(id),
    enabled: !!id,
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBillDto) => purchasesService.createBill(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.bills() });
      message.success('Bill created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create bill');
    },
  });
}

export function useApproveBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchasesService.approveBill(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.bills() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.billDetail(id) });
      message.success('Bill approved');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to approve bill');
    },
  });
}

export function useUpdateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateBillDto }) =>
      purchasesService.updateBill(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.bills() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.billDetail(id) });
      message.success('Bill updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update bill');
    },
  });
}

export function useVoidBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchasesService.voidBill(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.bills() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.billDetail(id) });
      message.success('Bill voided');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to void bill');
    },
  });
}

// ============ Payments ============

export function useVendorPayments(params?: PaymentQueryParams) {
  return useQuery<PaginatedResponse<VendorPayment>>({
    queryKey: purchaseKeys.paymentList(params || {}),
    queryFn: () => purchasesService.getPayments(params),
  });
}

export function useVendorPayment(id: string) {
  return useQuery<VendorPayment>({
    queryKey: [...purchaseKeys.payments(), 'detail', id],
    queryFn: () => purchasesService.getPayment(id),
    enabled: !!id,
  });
}

export function useVendorOpenBills(vendorId: string) {
  return useQuery<Bill[]>({
    queryKey: [...purchaseKeys.bills(), 'vendor', vendorId, 'open'],
    queryFn: () => purchasesService.getVendorOpenBills(vendorId),
    enabled: !!vendorId,
  });
}

export function useCreateVendorPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVendorPaymentDto) => purchasesService.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.payments() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.bills() });
      message.success('Payment recorded successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to record payment');
    },
  });
}
