import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  batchService,
  Batch,
  BatchDetail,
  BatchTransaction,
  BatchQueryParams,
  CreateBatchDto,
  UpdateBatchDto,
  BatchAdjustmentDto,
  BatchAllocationDto,
  BatchAllocationResult,
} from '@/lib/batch';
import { PaginatedResponse } from '@/lib/inventory';

// Query keys
export const batchKeys = {
  all: ['batches'] as const,
  lists: () => [...batchKeys.all, 'list'] as const,
  list: (params: BatchQueryParams) => [...batchKeys.lists(), params] as const,
  itemBatches: (itemId: string, params?: Omit<BatchQueryParams, 'itemId'>) =>
    [...batchKeys.all, 'item', itemId, params] as const,
  details: () => [...batchKeys.all, 'detail'] as const,
  detail: (id: string) => [...batchKeys.details(), id] as const,
  history: (id: string) => [...batchKeys.all, 'history', id] as const,
  expiring: (days?: number) => [...batchKeys.all, 'expiring', days] as const,
  expired: () => [...batchKeys.all, 'expired'] as const,
};

// ============ Batch Queries ============

export function useBatches(params?: BatchQueryParams) {
  return useQuery<PaginatedResponse<Batch>>({
    queryKey: batchKeys.list(params || {}),
    queryFn: () => batchService.listBatches(params),
  });
}

export function useItemBatches(itemId: string, params?: Omit<BatchQueryParams, 'itemId'>) {
  return useQuery<PaginatedResponse<Batch>>({
    queryKey: batchKeys.itemBatches(itemId, params),
    queryFn: () => batchService.listBatchesForItem(itemId, params),
    enabled: !!itemId,
  });
}

export function useBatch(batchId: string) {
  return useQuery<BatchDetail>({
    queryKey: batchKeys.detail(batchId),
    queryFn: () => batchService.getBatch(batchId),
    enabled: !!batchId,
  });
}

export function useBatchHistory(batchId: string) {
  return useQuery<BatchTransaction[]>({
    queryKey: batchKeys.history(batchId),
    queryFn: () => batchService.getBatchHistory(batchId),
    enabled: !!batchId,
  });
}

export function useExpiringBatches(days?: number) {
  return useQuery<Batch[]>({
    queryKey: batchKeys.expiring(days),
    queryFn: () => batchService.getExpiringBatches(days),
  });
}

export function useExpiredBatches() {
  return useQuery<Batch[]>({
    queryKey: batchKeys.expired(),
    queryFn: () => batchService.getExpiredBatches(),
  });
}

// ============ Batch Mutations ============

export function useCreateBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: CreateBatchDto }) =>
      batchService.createBatchForItem(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      message.success('Batch created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create batch');
    },
  });
}

export function useUpdateBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBatchDto }) =>
      batchService.updateBatch(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: batchKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: batchKeys.lists() });
      message.success('Batch updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update batch');
    },
  });
}

export function useBatchAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BatchAdjustmentDto) => batchService.adjustBatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      message.success('Batch adjustment completed');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to adjust batch');
    },
  });
}

export function useBatchAllocation() {
  return useMutation<BatchAllocationResult, Error, BatchAllocationDto>({
    mutationFn: (data: BatchAllocationDto) => batchService.allocateBatches(data),
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to allocate batches');
    },
  });
}
