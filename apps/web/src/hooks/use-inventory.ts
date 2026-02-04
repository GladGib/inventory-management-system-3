import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  inventoryService,
  StockLevel,
  StockQueryParams,
  Warehouse,
  InventoryAdjustment,
  AdjustmentQueryParams,
  CreateAdjustmentDto,
  InventoryTransfer,
  TransferQueryParams,
  CreateTransferDto,
  PaginatedResponse,
} from '@/lib/inventory';

// Query keys
export const inventoryKeys = {
  all: ['inventory'] as const,
  stock: () => [...inventoryKeys.all, 'stock'] as const,
  stockList: (params: StockQueryParams) => [...inventoryKeys.stock(), params] as const,
  stockByItem: (itemId: string) => [...inventoryKeys.stock(), 'item', itemId] as const,
  warehouses: () => [...inventoryKeys.all, 'warehouses'] as const,
  warehouse: (id: string) => [...inventoryKeys.warehouses(), id] as const,
  adjustments: () => [...inventoryKeys.all, 'adjustments'] as const,
  adjustmentList: (params: AdjustmentQueryParams) =>
    [...inventoryKeys.adjustments(), 'list', params] as const,
  adjustmentDetail: (id: string) => [...inventoryKeys.adjustments(), 'detail', id] as const,
  transfers: () => [...inventoryKeys.all, 'transfers'] as const,
  transferList: (params: TransferQueryParams) =>
    [...inventoryKeys.transfers(), 'list', params] as const,
  transferDetail: (id: string) => [...inventoryKeys.transfers(), 'detail', id] as const,
};

// ============ Stock Queries ============

export function useStockLevels(params?: StockQueryParams) {
  return useQuery<StockLevel[]>({
    queryKey: inventoryKeys.stockList(params || {}),
    queryFn: () => inventoryService.getStockLevels(params),
  });
}

export function useStockByItem(itemId: string) {
  return useQuery<StockLevel[]>({
    queryKey: inventoryKeys.stockByItem(itemId),
    queryFn: () => inventoryService.getStockByItem(itemId),
    enabled: !!itemId,
  });
}

export function useWarehouses() {
  return useQuery<Warehouse[]>({
    queryKey: inventoryKeys.warehouses(),
    queryFn: () => inventoryService.getWarehouses(),
  });
}

export function useWarehouse(id: string) {
  return useQuery<Warehouse>({
    queryKey: inventoryKeys.warehouse(id),
    queryFn: () => inventoryService.getWarehouse(id),
    enabled: !!id,
  });
}

// ============ Adjustments ============

export function useAdjustments(params?: AdjustmentQueryParams) {
  return useQuery<PaginatedResponse<InventoryAdjustment>>({
    queryKey: inventoryKeys.adjustmentList(params || {}),
    queryFn: () => inventoryService.getAdjustments(params),
  });
}

export function useAdjustment(id: string) {
  return useQuery<InventoryAdjustment>({
    queryKey: inventoryKeys.adjustmentDetail(id),
    queryFn: () => inventoryService.getAdjustment(id),
    enabled: !!id,
  });
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAdjustmentDto) => inventoryService.createAdjustment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.adjustments() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
      message.success('Adjustment created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create adjustment');
    },
  });
}

// ============ Transfers ============

export function useTransfers(params?: TransferQueryParams) {
  return useQuery<PaginatedResponse<InventoryTransfer>>({
    queryKey: inventoryKeys.transferList(params || {}),
    queryFn: () => inventoryService.getTransfers(params),
  });
}

export function useTransfer(id: string) {
  return useQuery<InventoryTransfer>({
    queryKey: inventoryKeys.transferDetail(id),
    queryFn: () => inventoryService.getTransfer(id),
    enabled: !!id,
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransferDto) => inventoryService.createTransfer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transfers() });
      message.success('Transfer created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create transfer');
    },
  });
}

export function useIssueTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => inventoryService.issueTransfer(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transfers() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transferDetail(id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
      message.success('Transfer issued');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to issue transfer');
    },
  });
}

export function useReceiveTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => inventoryService.receiveTransfer(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transfers() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transferDetail(id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
      message.success('Transfer received');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to receive transfer');
    },
  });
}

export function useCancelTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => inventoryService.cancelTransfer(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transfers() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transferDetail(id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
      message.success('Transfer cancelled');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to cancel transfer');
    },
  });
}
