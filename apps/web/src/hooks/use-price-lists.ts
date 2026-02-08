import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  priceListsService,
  PriceListDetail,
  PriceListsResponse,
  PriceListQueryParams,
  CreatePriceListDto,
  UpdatePriceListDto,
  AddPriceListItemDto,
  UpdatePriceListItemDto,
  BulkPriceUpdateDto,
  EffectivePriceResult,
} from '@/lib/price-lists';

// Query keys
export const priceListKeys = {
  all: ['price-lists'] as const,
  lists: () => [...priceListKeys.all, 'list'] as const,
  list: (params: PriceListQueryParams) => [...priceListKeys.lists(), params] as const,
  details: () => [...priceListKeys.all, 'detail'] as const,
  detail: (id: string) => [...priceListKeys.details(), id] as const,
  effectivePrice: (itemId: string, contactId?: string, qty?: number) =>
    [...priceListKeys.all, 'effective-price', itemId, contactId, qty] as const,
};

// ============ Queries ============

export function usePriceLists(params?: PriceListQueryParams) {
  return useQuery<PriceListsResponse>({
    queryKey: priceListKeys.list(params || {}),
    queryFn: () => priceListsService.getPriceLists(params),
  });
}

export function usePriceList(id: string) {
  return useQuery<PriceListDetail>({
    queryKey: priceListKeys.detail(id),
    queryFn: () => priceListsService.getPriceList(id),
    enabled: !!id,
  });
}

export function useEffectivePrice(itemId: string, contactId?: string, quantity?: number) {
  return useQuery<EffectivePriceResult>({
    queryKey: priceListKeys.effectivePrice(itemId, contactId, quantity),
    queryFn: () => priceListsService.getEffectivePrice(itemId, contactId, quantity),
    enabled: !!itemId,
  });
}

// ============ Mutations ============

export function useCreatePriceList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePriceListDto) => priceListsService.createPriceList(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: priceListKeys.lists() });
      message.success('Price list created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create price list');
    },
  });
}

export function useUpdatePriceList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePriceListDto }) =>
      priceListsService.updatePriceList(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: priceListKeys.lists() });
      queryClient.invalidateQueries({ queryKey: priceListKeys.detail(id) });
      message.success('Price list updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update price list');
    },
  });
}

export function useDeletePriceList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => priceListsService.deletePriceList(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: priceListKeys.lists() });
      message.success('Price list deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to delete price list');
    },
  });
}

export function useAddPriceListItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ priceListId, items }: { priceListId: string; items: AddPriceListItemDto[] }) =>
      priceListsService.addPriceListItems(priceListId, items),
    onSuccess: (_result, { priceListId }) => {
      queryClient.invalidateQueries({ queryKey: priceListKeys.detail(priceListId) });
      queryClient.invalidateQueries({ queryKey: priceListKeys.lists() });
      message.success('Items added to price list');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to add items');
    },
  });
}

export function useUpdatePriceListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      priceListId,
      itemId,
      data,
    }: {
      priceListId: string;
      itemId: string;
      data: UpdatePriceListItemDto;
    }) => priceListsService.updatePriceListItem(priceListId, itemId, data),
    onSuccess: (_result, { priceListId }) => {
      queryClient.invalidateQueries({ queryKey: priceListKeys.detail(priceListId) });
      message.success('Price updated');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update price');
    },
  });
}

export function useRemovePriceListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ priceListId, itemId }: { priceListId: string; itemId: string }) =>
      priceListsService.removePriceListItem(priceListId, itemId),
    onSuccess: (_result, { priceListId }) => {
      queryClient.invalidateQueries({ queryKey: priceListKeys.detail(priceListId) });
      queryClient.invalidateQueries({ queryKey: priceListKeys.lists() });
      message.success('Item removed from price list');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to remove item');
    },
  });
}

export function useBulkUpdatePrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ priceListId, data }: { priceListId: string; data: BulkPriceUpdateDto }) =>
      priceListsService.bulkUpdatePrices(priceListId, data),
    onSuccess: (_result, { priceListId }) => {
      queryClient.invalidateQueries({ queryKey: priceListKeys.detail(priceListId) });
      message.success(`${_result.updated} prices updated`);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update prices');
    },
  });
}

export function useImportPriceListItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      priceListId,
      data,
    }: {
      priceListId: string;
      data: Array<{ sku: string; customPrice: number; minQuantity?: number }>;
    }) => priceListsService.importItems(priceListId, data),
    onSuccess: (result, { priceListId }) => {
      queryClient.invalidateQueries({ queryKey: priceListKeys.detail(priceListId) });
      queryClient.invalidateQueries({ queryKey: priceListKeys.lists() });
      message.success(`Imported ${result.imported} items, ${result.skipped} skipped`);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to import items');
    },
  });
}
