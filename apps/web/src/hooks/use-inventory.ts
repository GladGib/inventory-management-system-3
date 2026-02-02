import { useQuery } from '@tanstack/react-query';
import {
  inventoryService,
  StockLevel,
  StockQueryParams,
  Warehouse,
} from '@/lib/inventory';

// Query keys
export const inventoryKeys = {
  all: ['inventory'] as const,
  stock: () => [...inventoryKeys.all, 'stock'] as const,
  stockList: (params: StockQueryParams) => [...inventoryKeys.stock(), params] as const,
  stockByItem: (itemId: string) => [...inventoryKeys.stock(), 'item', itemId] as const,
  warehouses: () => [...inventoryKeys.all, 'warehouses'] as const,
  warehouse: (id: string) => [...inventoryKeys.warehouses(), id] as const,
};

// ============ Queries ============

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
