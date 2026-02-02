import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  salesService,
  SalesOrder,
  Invoice,
  Payment,
  SalesOrderQueryParams,
  InvoiceQueryParams,
  PaymentQueryParams,
  PaginatedResponse,
  CreateSalesOrderDto,
  UpdateSalesOrderDto,
  CreateInvoiceDto,
  CreatePaymentDto,
} from '@/lib/sales';

// Query keys
export const salesKeys = {
  all: ['sales'] as const,
  orders: () => [...salesKeys.all, 'orders'] as const,
  orderList: (params: SalesOrderQueryParams) => [...salesKeys.orders(), 'list', params] as const,
  orderDetail: (id: string) => [...salesKeys.orders(), 'detail', id] as const,
  invoices: () => [...salesKeys.all, 'invoices'] as const,
  invoiceList: (params: InvoiceQueryParams) => [...salesKeys.invoices(), 'list', params] as const,
  invoiceDetail: (id: string) => [...salesKeys.invoices(), 'detail', id] as const,
  payments: () => [...salesKeys.all, 'payments'] as const,
  paymentList: (params: PaymentQueryParams) => [...salesKeys.payments(), 'list', params] as const,
  paymentDetail: (id: string) => [...salesKeys.payments(), 'detail', id] as const,
};

// ============ Sales Orders ============

export function useSalesOrders(params?: SalesOrderQueryParams) {
  return useQuery<PaginatedResponse<SalesOrder>>({
    queryKey: salesKeys.orderList(params || {}),
    queryFn: () => salesService.getOrders(params),
  });
}

export function useSalesOrder(id: string) {
  return useQuery<SalesOrder>({
    queryKey: salesKeys.orderDetail(id),
    queryFn: () => salesService.getOrder(id),
    enabled: !!id,
  });
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSalesOrderDto) => salesService.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.orders() });
      message.success('Sales order created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create sales order');
    },
  });
}

export function useUpdateSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSalesOrderDto }) =>
      salesService.updateOrder(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.orders() });
      queryClient.invalidateQueries({ queryKey: salesKeys.orderDetail(id) });
      message.success('Sales order updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update sales order');
    },
  });
}

export function useConfirmSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => salesService.confirmOrder(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.orders() });
      queryClient.invalidateQueries({ queryKey: salesKeys.orderDetail(id) });
      message.success('Sales order confirmed');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to confirm sales order');
    },
  });
}

export function useShipSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => salesService.shipOrder(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.orders() });
      queryClient.invalidateQueries({ queryKey: salesKeys.orderDetail(id) });
      message.success('Sales order marked as shipped');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to ship sales order');
    },
  });
}

export function useCancelSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => salesService.cancelOrder(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.orders() });
      queryClient.invalidateQueries({ queryKey: salesKeys.orderDetail(id) });
      message.success('Sales order cancelled');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to cancel sales order');
    },
  });
}

export function useCreateInvoiceFromOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => salesService.createInvoiceFromOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.orders() });
      queryClient.invalidateQueries({ queryKey: salesKeys.invoices() });
      message.success('Invoice created from order');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create invoice');
    },
  });
}

// ============ Invoices ============

export function useInvoices(params?: InvoiceQueryParams) {
  return useQuery<PaginatedResponse<Invoice>>({
    queryKey: salesKeys.invoiceList(params || {}),
    queryFn: () => salesService.getInvoices(params),
  });
}

export function useInvoice(id: string) {
  return useQuery<Invoice>({
    queryKey: salesKeys.invoiceDetail(id),
    queryFn: () => salesService.getInvoice(id),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvoiceDto) => salesService.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.invoices() });
      message.success('Invoice created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create invoice');
    },
  });
}

export function useSendInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => salesService.sendInvoice(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: salesKeys.invoiceDetail(id) });
      message.success('Invoice marked as sent');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to send invoice');
    },
  });
}

export function useVoidInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => salesService.voidInvoice(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: salesKeys.invoiceDetail(id) });
      message.success('Invoice voided');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to void invoice');
    },
  });
}

// ============ Payments ============

export function usePayments(params?: PaymentQueryParams) {
  return useQuery<PaginatedResponse<Payment>>({
    queryKey: salesKeys.paymentList(params || {}),
    queryFn: () => salesService.getPayments(params),
  });
}

export function usePayment(id: string) {
  return useQuery<Payment>({
    queryKey: salesKeys.paymentDetail(id),
    queryFn: () => salesService.getPayment(id),
    enabled: !!id,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentDto) => salesService.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.payments() });
      queryClient.invalidateQueries({ queryKey: salesKeys.invoices() });
      message.success('Payment recorded successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to record payment');
    },
  });
}
