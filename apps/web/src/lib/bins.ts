import { api } from './api';
import type { WarehouseZone, Bin, BinStockDetail, BinStock } from '@/types/models';
import type { BinType } from '@/types/enums';

// ============ Zone DTOs ============

export interface CreateZoneDto {
  name: string;
  description?: string;
}

export interface UpdateZoneDto {
  name?: string;
  description?: string;
}

// ============ Bin DTOs ============

export interface CreateBinDto {
  code: string;
  name?: string;
  type?: BinType;
  maxCapacity?: number;
  warehouseZoneId?: string;
  isActive?: boolean;
}

export interface UpdateBinDto {
  code?: string;
  name?: string;
  type?: BinType;
  maxCapacity?: number;
  warehouseZoneId?: string;
  isActive?: boolean;
}

export interface BinQueryParams {
  warehouseZoneId?: string;
  type?: BinType;
  isActive?: boolean;
  search?: string;
}

// ============ Stock Action DTOs ============

export interface BinStockActionDto {
  binId: string;
  itemId: string;
  quantity: number;
  batchId?: string;
}

// ============ Service ============

export const binsService = {
  // Zones
  async getZones(warehouseId: string): Promise<WarehouseZone[]> {
    const response = await api.get(`/warehouses/${warehouseId}/zones`);
    return response.data;
  },

  async createZone(warehouseId: string, data: CreateZoneDto): Promise<WarehouseZone> {
    const response = await api.post(`/warehouses/${warehouseId}/zones`, data);
    return response.data;
  },

  async updateZone(zoneId: string, data: UpdateZoneDto): Promise<WarehouseZone> {
    const response = await api.put(`/warehouses/zones/${zoneId}`, data);
    return response.data;
  },

  async deleteZone(zoneId: string): Promise<void> {
    await api.delete(`/warehouses/zones/${zoneId}`);
  },

  // Bins
  async getBins(warehouseId: string, params?: BinQueryParams): Promise<Bin[]> {
    const response = await api.get(`/warehouses/${warehouseId}/bins`, { params });
    return response.data;
  },

  async createBin(warehouseId: string, data: CreateBinDto): Promise<Bin> {
    const response = await api.post(`/warehouses/${warehouseId}/bins`, data);
    return response.data;
  },

  async updateBin(binId: string, data: UpdateBinDto): Promise<Bin> {
    const response = await api.put(`/warehouses/bins/${binId}`, data);
    return response.data;
  },

  async deleteBin(binId: string): Promise<void> {
    await api.delete(`/warehouses/bins/${binId}`);
  },

  // Bin Stock
  async getBinStock(binId: string): Promise<BinStockDetail> {
    const response = await api.get(`/warehouses/bins/${binId}/stock`);
    return response.data;
  },

  async putAway(data: BinStockActionDto): Promise<BinStock> {
    const response = await api.post('/warehouses/bins/put-away', data);
    return response.data;
  },

  async pick(data: BinStockActionDto): Promise<BinStock> {
    const response = await api.post('/warehouses/bins/pick', data);
    return response.data;
  },
};
