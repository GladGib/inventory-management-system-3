import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  itemsService,
  Item,
  ItemWithDetails,
  ItemQueryParams,
  ItemsResponse,
  CreateItemDto,
  UpdateItemDto,
  CrossReference,
  CreateCrossReferenceDto,
  UpdateCrossReferenceDto,
  PartNumberSearchResponse,
  BarcodeResponse,
  BatchBarcodeItem,
  BatchBarcodeRequest,
  SupersessionChainResponse,
  CreateSupersessionDto,
  PartSupersession,
} from '@/lib/items';

// Query keys
export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: (params: ItemQueryParams) => [...itemKeys.lists(), params] as const,
  details: () => [...itemKeys.all, 'detail'] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
  lowStock: () => [...itemKeys.all, 'low-stock'] as const,
  crossReferences: (itemId: string) => [...itemKeys.all, 'cross-references', itemId] as const,
  partNumberSearch: (query: string) => [...itemKeys.all, 'part-number-search', query] as const,
  barcode: (itemId: string) => [...itemKeys.all, 'barcode', itemId] as const,
  supersessionChain: (itemId: string) => [...itemKeys.all, 'supersession-chain', itemId] as const,
};

// ============ Queries ============

export function useItems(params?: ItemQueryParams) {
  return useQuery<ItemsResponse>({
    queryKey: itemKeys.list(params || {}),
    queryFn: () => itemsService.getItems(params),
  });
}

export function useItem(id: string) {
  return useQuery<ItemWithDetails>({
    queryKey: itemKeys.detail(id),
    queryFn: () => itemsService.getItem(id),
    enabled: !!id,
  });
}

export function useLowStockItems() {
  return useQuery<Item[]>({
    queryKey: itemKeys.lowStock(),
    queryFn: () => itemsService.getLowStockItems(),
  });
}

// ============ Mutations ============

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateItemDto) => itemsService.createItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      message.success('Item created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create item');
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateItemDto }) =>
      itemsService.updateItem(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: itemKeys.detail(id) });
      message.success('Item updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update item');
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => itemsService.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      message.success('Item deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to delete item');
    },
  });
}

// ============ Cross-Reference Hooks ============

export function useCrossReferences(itemId: string) {
  return useQuery<CrossReference[]>({
    queryKey: itemKeys.crossReferences(itemId),
    queryFn: () => itemsService.getCrossReferences(itemId),
    enabled: !!itemId,
  });
}

export function useAddCrossReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: CreateCrossReferenceDto }) =>
      itemsService.addCrossReference(itemId, data),
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.crossReferences(itemId) });
      message.success('Cross-reference added successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to add cross-reference');
    },
  });
}

export function useUpdateCrossReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      crossRefId,
      itemId,
      data,
    }: {
      crossRefId: string;
      itemId: string;
      data: UpdateCrossReferenceDto;
    }) => itemsService.updateCrossReference(crossRefId, data),
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.crossReferences(itemId) });
      message.success('Cross-reference updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update cross-reference');
    },
  });
}

export function useDeleteCrossReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ crossRefId }: { crossRefId: string; itemId: string }) =>
      itemsService.deleteCrossReference(crossRefId),
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.crossReferences(itemId) });
      message.success('Cross-reference deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to delete cross-reference');
    },
  });
}

export function useSearchByPartNumber(query: string) {
  return useQuery<PartNumberSearchResponse>({
    queryKey: itemKeys.partNumberSearch(query),
    queryFn: () => itemsService.searchByPartNumber(query),
    enabled: !!query && query.trim().length >= 2,
  });
}

// ============ Barcode Hooks ============

export function useBarcode(itemId: string, enabled = true) {
  return useQuery<BarcodeResponse>({
    queryKey: itemKeys.barcode(itemId),
    queryFn: () => itemsService.getBarcode(itemId),
    enabled: !!itemId && enabled,
  });
}

export function useBatchBarcodes() {
  return useMutation({
    mutationFn: (data: BatchBarcodeRequest) => itemsService.getBatchBarcodes(data),
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to generate barcodes');
    },
  });
}

// ============ Supersession Hooks ============

export function useSupersessionChain(itemId: string) {
  return useQuery<SupersessionChainResponse>({
    queryKey: itemKeys.supersessionChain(itemId),
    queryFn: () => itemsService.getSupersessionChain(itemId),
    enabled: !!itemId,
  });
}

export function useSupersedeItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      data,
    }: {
      itemId: string;
      data: CreateSupersessionDto;
    }) => itemsService.supersedeItem(itemId, data),
    onSuccess: (_, { itemId, data }) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.supersessionChain(itemId) });
      queryClient.invalidateQueries({ queryKey: itemKeys.supersessionChain(data.newItemId) });
      queryClient.invalidateQueries({ queryKey: itemKeys.detail(itemId) });
      message.success('Supersession created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create supersession');
    },
  });
}
