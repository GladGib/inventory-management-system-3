import { api } from './api';

// ============ Types ============

export interface VehicleMake {
  id: string;
  name: string;
  country?: string | null;
  organizationId: string;
  modelCount?: number;
  compatibilityCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleModel {
  id: string;
  makeId: string;
  name: string;
  organizationId: string;
  make?: VehicleMake;
  compatibilityCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ItemVehicleCompatibility {
  id: string;
  itemId: string;
  vehicleMakeId: string;
  vehicleModelId?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  notes?: string | null;
  organizationId: string;
  vehicleMake?: VehicleMake;
  vehicleModel?: VehicleModel | null;
  createdAt: string;
}

export interface CreateMakeDto {
  name: string;
  country?: string;
}

export interface UpdateMakeDto {
  name?: string;
  country?: string;
}

export interface CreateModelDto {
  name: string;
}

export interface UpdateModelDto {
  name?: string;
}

export interface CreateCompatibilityDto {
  vehicleMakeId: string;
  vehicleModelId?: string;
  yearFrom?: number;
  yearTo?: number;
  notes?: string;
}

export interface VehicleSearchParams {
  makeId?: string;
  modelId?: string;
  year?: number;
  page?: number;
  limit?: number;
}

export interface VehicleSearchResponse {
  data: Array<{
    id: string;
    sku: string;
    name: string;
    brand?: string;
    partNumber?: string;
    costPrice: number;
    sellingPrice: number;
    stockOnHand: number;
    availableStock: number;
    category?: { id: string; name: string };
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// ============ Service ============

export const vehiclesService = {
  // Makes
  async getMakes(): Promise<VehicleMake[]> {
    const response = await api.get<VehicleMake[]>('/vehicles/makes');
    return response.data;
  },

  async createMake(data: CreateMakeDto): Promise<VehicleMake> {
    const response = await api.post<VehicleMake>('/vehicles/makes', data);
    return response.data;
  },

  async updateMake(id: string, data: UpdateMakeDto): Promise<VehicleMake> {
    const response = await api.put<VehicleMake>(`/vehicles/makes/${id}`, data);
    return response.data;
  },

  async deleteMake(id: string): Promise<void> {
    await api.delete(`/vehicles/makes/${id}`);
  },

  // Models
  async getModels(makeId: string): Promise<VehicleModel[]> {
    const response = await api.get<VehicleModel[]>(`/vehicles/makes/${makeId}/models`);
    return response.data;
  },

  async createModel(makeId: string, data: CreateModelDto): Promise<VehicleModel> {
    const response = await api.post<VehicleModel>(`/vehicles/makes/${makeId}/models`, data);
    return response.data;
  },

  async updateModel(id: string, data: UpdateModelDto): Promise<VehicleModel> {
    const response = await api.put<VehicleModel>(`/vehicles/models/${id}`, data);
    return response.data;
  },

  async deleteModel(id: string): Promise<void> {
    await api.delete(`/vehicles/models/${id}`);
  },

  // Compatibility
  async getItemCompatibility(itemId: string): Promise<ItemVehicleCompatibility[]> {
    const response = await api.get<ItemVehicleCompatibility[]>(`/items/${itemId}/compatibility`);
    return response.data;
  },

  async addCompatibility(itemId: string, data: CreateCompatibilityDto): Promise<ItemVehicleCompatibility> {
    const response = await api.post<ItemVehicleCompatibility>(`/items/${itemId}/compatibility`, data);
    return response.data;
  },

  async removeCompatibility(id: string): Promise<void> {
    await api.delete(`/items/compatibility/${id}`);
  },

  // Search
  async searchByVehicle(params: VehicleSearchParams): Promise<VehicleSearchResponse> {
    const response = await api.get<VehicleSearchResponse>('/items/search/by-vehicle', { params });
    return response.data;
  },
};
