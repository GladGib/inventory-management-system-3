import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  binsService,
  CreateZoneDto,
  UpdateZoneDto,
  CreateBinDto,
  UpdateBinDto,
  BinQueryParams,
  BinStockActionDto,
} from '@/lib/bins';
import type { WarehouseZone, Bin, BinStockDetail, BinStock } from '@/types/models';

// Query keys
export const binKeys = {
  all: ['bins'] as const,
  zones: (warehouseId: string) => [...binKeys.all, 'zones', warehouseId] as const,
  bins: (warehouseId: string) => [...binKeys.all, 'bins', warehouseId] as const,
  binList: (warehouseId: string, params: BinQueryParams) =>
    [...binKeys.bins(warehouseId), params] as const,
  binStock: (binId: string) => [...binKeys.all, 'stock', binId] as const,
};

// ============ Zone Hooks ============

export function useZones(warehouseId: string) {
  return useQuery<WarehouseZone[]>({
    queryKey: binKeys.zones(warehouseId),
    queryFn: () => binsService.getZones(warehouseId),
    enabled: !!warehouseId,
  });
}

export function useCreateZone(warehouseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateZoneDto) => binsService.createZone(warehouseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: binKeys.zones(warehouseId) });
      message.success('Zone created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create zone');
    },
  });
}

export function useUpdateZone(warehouseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ zoneId, data }: { zoneId: string; data: UpdateZoneDto }) =>
      binsService.updateZone(zoneId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: binKeys.zones(warehouseId) });
      message.success('Zone updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update zone');
    },
  });
}

export function useDeleteZone(warehouseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (zoneId: string) => binsService.deleteZone(zoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: binKeys.zones(warehouseId) });
      message.success('Zone deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to delete zone');
    },
  });
}

// ============ Bin Hooks ============

export function useBins(warehouseId: string, params?: BinQueryParams) {
  return useQuery<Bin[]>({
    queryKey: binKeys.binList(warehouseId, params || {}),
    queryFn: () => binsService.getBins(warehouseId, params),
    enabled: !!warehouseId,
  });
}

export function useCreateBin(warehouseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBinDto) => binsService.createBin(warehouseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: binKeys.bins(warehouseId) });
      message.success('Bin created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create bin');
    },
  });
}

export function useUpdateBin(warehouseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ binId, data }: { binId: string; data: UpdateBinDto }) =>
      binsService.updateBin(binId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: binKeys.bins(warehouseId) });
      message.success('Bin updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update bin');
    },
  });
}

export function useDeleteBin(warehouseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (binId: string) => binsService.deleteBin(binId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: binKeys.bins(warehouseId) });
      message.success('Bin deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to delete bin');
    },
  });
}

// ============ Bin Stock Hooks ============

export function useBinStock(binId: string) {
  return useQuery<BinStockDetail>({
    queryKey: binKeys.binStock(binId),
    queryFn: () => binsService.getBinStock(binId),
    enabled: !!binId,
  });
}

export function usePutAway(warehouseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BinStockActionDto) => binsService.putAway(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: binKeys.bins(warehouseId) });
      queryClient.invalidateQueries({ queryKey: binKeys.binStock(variables.binId) });
      message.success('Item put away successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to put away item');
    },
  });
}

export function usePick(warehouseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BinStockActionDto) => binsService.pick(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: binKeys.bins(warehouseId) });
      queryClient.invalidateQueries({ queryKey: binKeys.binStock(variables.binId) });
      message.success('Item picked successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to pick item');
    },
  });
}
