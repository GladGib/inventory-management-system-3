import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  compositeService,
  CompositeItem,
  BOMAvailability,
  BOMCost,
  Assembly,
  AssemblyQueryParams,
  PaginatedResponse,
  CreateCompositeDto,
  UpdateBOMDto,
  CreateAssemblyDto,
  CreateDisassemblyDto,
} from '@/lib/composite';

// Query keys
export const compositeKeys = {
  all: ['composite'] as const,
  bom: (itemId: string) => [...compositeKeys.all, 'bom', itemId] as const,
  bomAvailability: (itemId: string, warehouseId?: string) =>
    [...compositeKeys.all, 'bom', 'availability', itemId, warehouseId] as const,
  bomCost: (itemId: string) => [...compositeKeys.all, 'bom', 'cost', itemId] as const,
  assemblies: () => [...compositeKeys.all, 'assemblies'] as const,
  assemblyList: (params: AssemblyQueryParams) =>
    [...compositeKeys.assemblies(), 'list', params] as const,
  assembly: (id: string) => [...compositeKeys.assemblies(), 'detail', id] as const,
};

// ============ BOM Queries ============

export function useBOM(itemId: string) {
  return useQuery<CompositeItem>({
    queryKey: compositeKeys.bom(itemId),
    queryFn: () => compositeService.getBOM(itemId),
    enabled: !!itemId,
  });
}

export function useBOMAvailability(itemId: string, warehouseId?: string) {
  return useQuery<BOMAvailability>({
    queryKey: compositeKeys.bomAvailability(itemId, warehouseId),
    queryFn: () => compositeService.getBOMAvailability(itemId, warehouseId),
    enabled: !!itemId,
  });
}

export function useBOMCost(itemId: string) {
  return useQuery<BOMCost>({
    queryKey: compositeKeys.bomCost(itemId),
    queryFn: () => compositeService.getBOMCost(itemId),
    enabled: !!itemId,
  });
}

// ============ BOM Mutations ============

export function useCreateComposite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCompositeDto) => compositeService.createCompositeItem(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: compositeKeys.bom(variables.itemId) });
      message.success('Composite item created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create composite item');
    },
  });
}

export function useUpdateBOM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateBOMDto }) =>
      compositeService.updateBOM(itemId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: compositeKeys.bom(variables.itemId) });
      queryClient.invalidateQueries({
        queryKey: compositeKeys.bomAvailability(variables.itemId),
      });
      queryClient.invalidateQueries({ queryKey: compositeKeys.bomCost(variables.itemId) });
      message.success('BOM updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update BOM');
    },
  });
}

// ============ Assembly Queries ============

export function useAssemblies(params?: AssemblyQueryParams) {
  return useQuery<PaginatedResponse<Assembly>>({
    queryKey: compositeKeys.assemblyList(params || {}),
    queryFn: () => compositeService.getAssemblies(params),
  });
}

export function useAssembly(id: string) {
  return useQuery<Assembly>({
    queryKey: compositeKeys.assembly(id),
    queryFn: () => compositeService.getAssembly(id),
    enabled: !!id,
  });
}

// ============ Assembly Mutations ============

export function useCreateAssembly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAssemblyDto) => compositeService.createAssembly(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: compositeKeys.assemblies() });
      message.success('Assembly order created');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create assembly');
    },
  });
}

export function useCompleteAssembly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => compositeService.completeAssembly(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: compositeKeys.assemblies() });
      queryClient.invalidateQueries({ queryKey: compositeKeys.assembly(id) });
      message.success('Assembly completed');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to complete assembly');
    },
  });
}

export function useCancelAssembly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => compositeService.cancelAssembly(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: compositeKeys.assemblies() });
      queryClient.invalidateQueries({ queryKey: compositeKeys.assembly(id) });
      message.success('Assembly cancelled');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to cancel assembly');
    },
  });
}

export function useCreateDisassembly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDisassemblyDto) => compositeService.createDisassembly(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: compositeKeys.assemblies() });
      message.success('Disassembly completed');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create disassembly');
    },
  });
}
