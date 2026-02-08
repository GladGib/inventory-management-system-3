import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  coreReturnsService,
  CoreReturn,
  CoreReturnQueryParams,
  PaginatedResponse,
  CreateCoreReturnDto,
  ActionDto,
} from '@/lib/core-returns';

// Query keys
export const coreReturnKeys = {
  all: ['core-returns'] as const,
  lists: () => [...coreReturnKeys.all, 'list'] as const,
  list: (params: CoreReturnQueryParams) =>
    [...coreReturnKeys.lists(), params] as const,
  details: () => [...coreReturnKeys.all, 'detail'] as const,
  detail: (id: string) => [...coreReturnKeys.details(), id] as const,
  customerPending: (customerId: string) =>
    [...coreReturnKeys.all, 'customer-pending', customerId] as const,
  overdueCount: () => [...coreReturnKeys.all, 'overdue-count'] as const,
};

// ============ Queries ============

export function useCoreReturns(params?: CoreReturnQueryParams) {
  return useQuery<PaginatedResponse<CoreReturn>>({
    queryKey: coreReturnKeys.list(params || {}),
    queryFn: () => coreReturnsService.getCoreReturns(params),
  });
}

export function useCoreReturn(id: string) {
  return useQuery<CoreReturn>({
    queryKey: coreReturnKeys.detail(id),
    queryFn: () => coreReturnsService.getCoreReturn(id),
    enabled: !!id,
  });
}

export function useCustomerPendingCoreReturns(customerId: string) {
  return useQuery<CoreReturn[]>({
    queryKey: coreReturnKeys.customerPending(customerId),
    queryFn: () => coreReturnsService.getCustomerPendingCoreReturns(customerId),
    enabled: !!customerId,
  });
}

export function useOverdueCoreReturnsCount() {
  return useQuery<{ count: number }>({
    queryKey: coreReturnKeys.overdueCount(),
    queryFn: () => coreReturnsService.getOverdueCount(),
  });
}

// ============ Mutations ============

export function useCreateCoreReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCoreReturnDto) =>
      coreReturnsService.createCoreReturn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coreReturnKeys.lists() });
      message.success('Core return created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(
        error.response?.data?.message || 'Failed to create core return',
      );
    },
  });
}

export function useReceiveCoreReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ActionDto }) =>
      coreReturnsService.receiveCoreReturn(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: coreReturnKeys.lists() });
      queryClient.invalidateQueries({ queryKey: coreReturnKeys.detail(id) });
      message.success('Core return marked as received');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(
        error.response?.data?.message || 'Failed to receive core return',
      );
    },
  });
}

export function useCreditCoreReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ActionDto }) =>
      coreReturnsService.creditCoreReturn(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: coreReturnKeys.lists() });
      queryClient.invalidateQueries({ queryKey: coreReturnKeys.detail(id) });
      message.success('Core return credited successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(
        error.response?.data?.message || 'Failed to credit core return',
      );
    },
  });
}

export function useRejectCoreReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ActionDto }) =>
      coreReturnsService.rejectCoreReturn(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: coreReturnKeys.lists() });
      queryClient.invalidateQueries({ queryKey: coreReturnKeys.detail(id) });
      message.success('Core return rejected');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(
        error.response?.data?.message || 'Failed to reject core return',
      );
    },
  });
}
