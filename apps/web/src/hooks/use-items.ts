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
} from '@/lib/items';

// Query keys
export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: (params: ItemQueryParams) => [...itemKeys.lists(), params] as const,
  details: () => [...itemKeys.all, 'detail'] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
  lowStock: () => [...itemKeys.all, 'low-stock'] as const,
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
