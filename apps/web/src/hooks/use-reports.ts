import { useQuery, useMutation } from '@tanstack/react-query';
import {
  reportsService,
  DateRange,
  PaginationParams,
  SalesSummary,
  SalesByCustomerResponse,
  SalesByItemResponse,
  ReceivablesAgingResponse,
  PayablesAgingResponse,
  InventorySummaryResponse,
  InventoryValuationResponse,
  StockAgingResponse,
  StockAgingFilters,
  SSTReportResponse,
} from '@/lib/reports';

// Query keys
export const reportKeys = {
  all: ['reports'] as const,
  sales: () => [...reportKeys.all, 'sales'] as const,
  salesSummary: (dateRange: DateRange) => [...reportKeys.sales(), 'summary', dateRange] as const,
  salesByCustomer: (dateRange: DateRange, pagination?: PaginationParams) =>
    [...reportKeys.sales(), 'by-customer', dateRange, pagination] as const,
  salesByItem: (dateRange: DateRange, pagination?: PaginationParams) =>
    [...reportKeys.sales(), 'by-item', dateRange, pagination] as const,
  receivablesAging: () => [...reportKeys.sales(), 'receivables-aging'] as const,
  inventory: () => [...reportKeys.all, 'inventory'] as const,
  inventorySummary: (pagination?: PaginationParams) =>
    [...reportKeys.inventory(), 'summary', pagination] as const,
  inventoryValuation: (warehouseId?: string, pagination?: PaginationParams) =>
    [...reportKeys.inventory(), 'valuation', warehouseId, pagination] as const,
  purchases: () => [...reportKeys.all, 'purchases'] as const,
  payablesAging: () => [...reportKeys.purchases(), 'payables-aging'] as const,
  tax: () => [...reportKeys.all, 'tax'] as const,
  sst: (dateRange: DateRange) => [...reportKeys.tax(), 'sst', dateRange] as const,
};

// ============ Sales Report Queries ============

export function useSalesSummary(dateRange: DateRange) {
  return useQuery<SalesSummary>({
    queryKey: reportKeys.salesSummary(dateRange),
    queryFn: () => reportsService.getSalesSummary(dateRange),
    enabled: !!dateRange.fromDate && !!dateRange.toDate,
  });
}

export function useSalesByCustomer(dateRange: DateRange, pagination?: PaginationParams) {
  return useQuery<SalesByCustomerResponse>({
    queryKey: reportKeys.salesByCustomer(dateRange, pagination),
    queryFn: () => reportsService.getSalesByCustomer(dateRange, pagination),
    enabled: !!dateRange.fromDate && !!dateRange.toDate,
  });
}

export function useSalesByItem(dateRange: DateRange, pagination?: PaginationParams) {
  return useQuery<SalesByItemResponse>({
    queryKey: reportKeys.salesByItem(dateRange, pagination),
    queryFn: () => reportsService.getSalesByItem(dateRange, pagination),
    enabled: !!dateRange.fromDate && !!dateRange.toDate,
  });
}

export function useReceivablesAging() {
  return useQuery<ReceivablesAgingResponse>({
    queryKey: reportKeys.receivablesAging(),
    queryFn: () => reportsService.getReceivablesAging(),
  });
}

// ============ Inventory Report Queries ============

export function useInventorySummary(pagination?: PaginationParams) {
  return useQuery<InventorySummaryResponse>({
    queryKey: reportKeys.inventorySummary(pagination),
    queryFn: () => reportsService.getInventorySummary(pagination),
  });
}

export function useInventoryValuation(warehouseId?: string, pagination?: PaginationParams) {
  return useQuery<InventoryValuationResponse>({
    queryKey: reportKeys.inventoryValuation(warehouseId, pagination),
    queryFn: () => reportsService.getInventoryValuation(warehouseId, pagination),
  });
}

// ============ Purchase Report Queries ============

export function usePayablesAging() {
  return useQuery<PayablesAgingResponse>({
    queryKey: reportKeys.payablesAging(),
    queryFn: () => reportsService.getPayablesAging(),
  });
}

// ============ SST Tax Report Queries ============

export function useSSTReport(dateRange: DateRange) {
  return useQuery<SSTReportResponse>({
    queryKey: reportKeys.sst(dateRange),
    queryFn: () => reportsService.getSSTReport(dateRange),
    enabled: !!dateRange.fromDate && !!dateRange.toDate,
  });
}

// ============ Stock Aging Report Queries ============

export function useStockAging(filters?: StockAgingFilters) {
  return useQuery<StockAgingResponse>({
    queryKey: [...reportKeys.inventory(), 'stock-aging', filters],
    queryFn: () => reportsService.getStockAging(filters),
  });
}

// ============ Export Utilities ============

export function useExportReport() {
  return useMutation({
    mutationFn: async ({
      reportType,
      format,
      params,
    }: {
      reportType: string;
      format: 'xlsx' | 'pdf';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params?: Record<string, any>;
    }) => {
      const blob = await reportsService.exportReport(reportType, format, params);
      return blob;
    },
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
