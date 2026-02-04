import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  itemGroupsService,
  ItemGroupWithItems,
  ItemGroupsResponse,
  ItemGroupQueryParams,
  CreateItemGroupDto,
  UpdateItemGroupDto,
  GenerateVariantsDto,
} from '@/lib/item-groups';

// Query keys
export const itemGroupKeys = {
  all: ['item-groups'] as const,
  lists: () => [...itemGroupKeys.all, 'list'] as const,
  list: (params: ItemGroupQueryParams) => [...itemGroupKeys.lists(), params] as const,
  details: () => [...itemGroupKeys.all, 'detail'] as const,
  detail: (id: string) => [...itemGroupKeys.details(), id] as const,
};

// ============ Queries ============

export function useItemGroups(params?: ItemGroupQueryParams) {
  return useQuery<ItemGroupsResponse>({
    queryKey: itemGroupKeys.list(params || {}),
    queryFn: () => itemGroupsService.getItemGroups(params),
  });
}

export function useItemGroup(id: string) {
  return useQuery<ItemGroupWithItems>({
    queryKey: itemGroupKeys.detail(id),
    queryFn: () => itemGroupsService.getItemGroup(id),
    enabled: !!id,
  });
}

// ============ Mutations ============

export function useCreateItemGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateItemGroupDto) => itemGroupsService.createItemGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemGroupKeys.lists() });
      message.success('Item group created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create item group');
    },
  });
}

export function useUpdateItemGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateItemGroupDto }) =>
      itemGroupsService.updateItemGroup(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: itemGroupKeys.lists() });
      queryClient.invalidateQueries({ queryKey: itemGroupKeys.detail(id) });
      message.success('Item group updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update item group');
    },
  });
}

export function useDeleteItemGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => itemGroupsService.deleteItemGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemGroupKeys.lists() });
      message.success('Item group deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to delete item group');
    },
  });
}

export function useGenerateVariants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: GenerateVariantsDto }) =>
      itemGroupsService.generateVariants(groupId, data),
    onSuccess: (result, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: itemGroupKeys.detail(groupId) });
      queryClient.invalidateQueries({ queryKey: ['items'] }); // Invalidate items list too
      message.success(
        `Created ${result.created} variants${
          result.skipped > 0 ? `, ${result.skipped} skipped (already exist)` : ''
        }`
      );
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to generate variants');
    },
  });
}

export function useRemoveVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, variantId }: { groupId: string; variantId: string }) =>
      itemGroupsService.removeVariant(groupId, variantId),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: itemGroupKeys.detail(groupId) });
      message.success('Variant removed from group');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to remove variant');
    },
  });
}

export function useBulkUpdateVariants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      updates,
    }: {
      groupId: string;
      updates: Array<{
        variantId: string;
        costPrice?: number;
        sellingPrice?: number;
      }>;
    }) => itemGroupsService.bulkUpdateVariants(groupId, updates),
    onSuccess: (result, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: itemGroupKeys.detail(groupId) });
      message.success(`Updated ${result.updated} variants`);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update variants');
    },
  });
}
