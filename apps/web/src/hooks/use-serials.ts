import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  serialService,
  Serial,
  SerialDetail,
  SerialHistory,
  SerialQueryParams,
  CreateBulkSerialsDto,
  UpdateSerialDto,
  AssignSerialsDto,
  CreateWarrantyClaimDto,
  UpdateWarrantyClaimDto,
  WarrantyClaim,
  WarrantyClaimQueryParams,
  WarrantyReport,
} from '@/lib/serial';
import { PaginatedResponse } from '@/lib/inventory';

// Query keys
export const serialKeys = {
  all: ['serials'] as const,
  lists: () => [...serialKeys.all, 'list'] as const,
  list: (params: SerialQueryParams) => [...serialKeys.lists(), params] as const,
  itemSerials: (itemId: string, params?: Record<string, unknown>) =>
    [...serialKeys.all, 'item', itemId, params] as const,
  details: () => [...serialKeys.all, 'detail'] as const,
  detail: (id: string) => [...serialKeys.details(), id] as const,
  history: (id: string) => [...serialKeys.all, 'history', id] as const,
  search: (query: string) => [...serialKeys.all, 'search', query] as const,
  available: (itemId: string, warehouseId: string) =>
    [...serialKeys.all, 'available', itemId, warehouseId] as const,
  warrantyClaims: () => [...serialKeys.all, 'warranty-claims'] as const,
  warrantyClaimList: (params: WarrantyClaimQueryParams) =>
    [...serialKeys.warrantyClaims(), params] as const,
  warrantyReport: () => [...serialKeys.all, 'warranty-report'] as const,
};

// ============ Serial Queries ============

export function useSerials(params?: SerialQueryParams) {
  return useQuery<PaginatedResponse<Serial>>({
    queryKey: serialKeys.list(params || {}),
    queryFn: () => serialService.listSerials(params),
  });
}

export function useItemSerials(itemId: string, params?: Omit<SerialQueryParams, 'itemId'>) {
  return useQuery<PaginatedResponse<Serial>>({
    queryKey: serialKeys.itemSerials(itemId, params),
    queryFn: () => serialService.listSerialsForItem(itemId, params),
    enabled: !!itemId,
  });
}

export function useSerial(serialId: string) {
  return useQuery<SerialDetail>({
    queryKey: serialKeys.detail(serialId),
    queryFn: () => serialService.getSerial(serialId),
    enabled: !!serialId,
  });
}

export function useSerialHistory(serialId: string) {
  return useQuery<SerialHistory[]>({
    queryKey: serialKeys.history(serialId),
    queryFn: () => serialService.getSerialHistory(serialId),
    enabled: !!serialId,
  });
}

export function useSearchSerials(query: string) {
  return useQuery<Serial[]>({
    queryKey: serialKeys.search(query),
    queryFn: () => serialService.searchSerials(query),
    enabled: query.length >= 2,
  });
}

export function useAvailableSerials(itemId: string, warehouseId: string) {
  return useQuery<Serial[]>({
    queryKey: serialKeys.available(itemId, warehouseId),
    queryFn: () => serialService.getAvailableSerials(itemId, warehouseId),
    enabled: !!itemId && !!warehouseId,
  });
}

// ============ Serial Mutations ============

export function useRegisterSerials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: CreateBulkSerialsDto }) =>
      serialService.registerSerialsForItem(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serialKeys.all });
      message.success('Serial numbers registered successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to register serials');
    },
  });
}

export function useUpdateSerial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSerialDto }) =>
      serialService.updateSerial(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: serialKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: serialKeys.lists() });
      message.success('Serial number updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update serial');
    },
  });
}

export function useAssignSerials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AssignSerialsDto) => serialService.assignSerials(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serialKeys.all });
      message.success('Serials assigned to sale');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to assign serials');
    },
  });
}

// ============ Warranty Claims ============

export function useWarrantyClaims(params?: WarrantyClaimQueryParams) {
  return useQuery<PaginatedResponse<WarrantyClaim>>({
    queryKey: serialKeys.warrantyClaimList(params || {}),
    queryFn: () => serialService.getWarrantyClaims(params),
  });
}

export function useCreateWarrantyClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serialId, data }: { serialId: string; data: CreateWarrantyClaimDto }) =>
      serialService.createWarrantyClaim(serialId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serialKeys.warrantyClaims() });
      message.success('Warranty claim created');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create warranty claim');
    },
  });
}

export function useUpdateWarrantyClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWarrantyClaimDto }) =>
      serialService.updateWarrantyClaim(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serialKeys.warrantyClaims() });
      message.success('Warranty claim updated');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update warranty claim');
    },
  });
}

export function useWarrantyReport() {
  return useQuery<WarrantyReport>({
    queryKey: serialKeys.warrantyReport(),
    queryFn: () => serialService.getWarrantyReport(),
  });
}
