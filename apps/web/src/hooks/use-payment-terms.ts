import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  paymentTermsService,
  PaymentTerm,
  CreatePaymentTermDto,
  UpdatePaymentTermDto,
} from '@/lib/payment-terms';

// Query keys
export const paymentTermKeys = {
  all: ['payment-terms'] as const,
  list: () => [...paymentTermKeys.all, 'list'] as const,
  detail: (id: string) => [...paymentTermKeys.all, 'detail', id] as const,
};

// ============ Queries ============

export function usePaymentTerms() {
  return useQuery<PaymentTerm[]>({
    queryKey: paymentTermKeys.list(),
    queryFn: () => paymentTermsService.getPaymentTerms(),
  });
}

export function usePaymentTerm(id: string) {
  return useQuery<PaymentTerm>({
    queryKey: paymentTermKeys.detail(id),
    queryFn: () => paymentTermsService.getPaymentTerm(id),
    enabled: !!id,
  });
}

// ============ Mutations ============

export function useCreatePaymentTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentTermDto) => paymentTermsService.createPaymentTerm(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentTermKeys.list() });
      message.success('Payment term created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create payment term');
    },
  });
}

export function useUpdatePaymentTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePaymentTermDto }) =>
      paymentTermsService.updatePaymentTerm(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: paymentTermKeys.list() });
      queryClient.invalidateQueries({ queryKey: paymentTermKeys.detail(id) });
      message.success('Payment term updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update payment term');
    },
  });
}

export function useDeletePaymentTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => paymentTermsService.deletePaymentTerm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentTermKeys.list() });
      message.success('Payment term deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to delete payment term');
    },
  });
}

export function useSetDefaultPaymentTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => paymentTermsService.setDefaultPaymentTerm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentTermKeys.list() });
      message.success('Default payment term updated');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to set default payment term');
    },
  });
}

export function useSeedDefaultPaymentTerms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => paymentTermsService.seedDefaultPaymentTerms(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentTermKeys.list() });
      message.success('Default payment terms created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create default payment terms');
    },
  });
}
