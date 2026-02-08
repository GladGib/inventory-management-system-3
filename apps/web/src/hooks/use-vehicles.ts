import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  vehiclesService,
  VehicleMake,
  VehicleModel,
  ItemVehicleCompatibility,
  CreateMakeDto,
  UpdateMakeDto,
  CreateModelDto,
  UpdateModelDto,
  CreateCompatibilityDto,
  VehicleSearchParams,
  VehicleSearchResponse,
} from '@/lib/vehicles';

// Query keys
export const vehicleKeys = {
  all: ['vehicles'] as const,
  makes: () => [...vehicleKeys.all, 'makes'] as const,
  models: (makeId: string) => [...vehicleKeys.all, 'models', makeId] as const,
  compatibility: (itemId: string) => [...vehicleKeys.all, 'compatibility', itemId] as const,
  search: (params: VehicleSearchParams) => [...vehicleKeys.all, 'search', params] as const,
};

// ============ Makes Queries ============

export function useVehicleMakes() {
  return useQuery<VehicleMake[]>({
    queryKey: vehicleKeys.makes(),
    queryFn: () => vehiclesService.getMakes(),
  });
}

export function useCreateMake() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMakeDto) => vehiclesService.createMake(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.makes() });
      message.success('Vehicle make created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create vehicle make');
    },
  });
}

export function useUpdateMake() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMakeDto }) =>
      vehiclesService.updateMake(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.makes() });
      message.success('Vehicle make updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update vehicle make');
    },
  });
}

export function useDeleteMake() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => vehiclesService.deleteMake(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.makes() });
      message.success('Vehicle make deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to delete vehicle make');
    },
  });
}

// ============ Models Queries ============

export function useVehicleModels(makeId: string) {
  return useQuery<VehicleModel[]>({
    queryKey: vehicleKeys.models(makeId),
    queryFn: () => vehiclesService.getModels(makeId),
    enabled: !!makeId,
  });
}

export function useCreateModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ makeId, data }: { makeId: string; data: CreateModelDto }) =>
      vehiclesService.createModel(makeId, data),
    onSuccess: (_, { makeId }) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.models(makeId) });
      queryClient.invalidateQueries({ queryKey: vehicleKeys.makes() });
      message.success('Vehicle model created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create vehicle model');
    },
  });
}

export function useUpdateModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateModelDto }) =>
      vehiclesService.updateModel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
      message.success('Vehicle model updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update vehicle model');
    },
  });
}

export function useDeleteModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => vehiclesService.deleteModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
      message.success('Vehicle model deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to delete vehicle model');
    },
  });
}

// ============ Compatibility Queries ============

export function useItemCompatibility(itemId: string) {
  return useQuery<ItemVehicleCompatibility[]>({
    queryKey: vehicleKeys.compatibility(itemId),
    queryFn: () => vehiclesService.getItemCompatibility(itemId),
    enabled: !!itemId,
  });
}

export function useAddCompatibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: CreateCompatibilityDto }) =>
      vehiclesService.addCompatibility(itemId, data),
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.compatibility(itemId) });
      message.success('Vehicle compatibility added successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to add vehicle compatibility');
    },
  });
}

export function useRemoveCompatibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, itemId }: { id: string; itemId: string }) =>
      vehiclesService.removeCompatibility(id),
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.compatibility(itemId) });
      message.success('Vehicle compatibility removed');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to remove vehicle compatibility');
    },
  });
}

// ============ Search ============

export function useVehicleSearch(params: VehicleSearchParams) {
  return useQuery<VehicleSearchResponse>({
    queryKey: vehicleKeys.search(params),
    queryFn: () => vehiclesService.searchByVehicle(params),
    enabled: !!params.makeId,
  });
}
