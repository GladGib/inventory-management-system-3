import { useQuery } from '@tanstack/react-query';
import {
  dashboardService,
  DashboardOverview,
  SalesTrendData,
  TopItem,
  TopCustomer,
  DashboardAlert,
  DashboardAlerts,
} from '@/lib/dashboard';

// Query keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: () => [...dashboardKeys.all, 'overview'] as const,
  salesTrend: (months: number) => [...dashboardKeys.all, 'sales-trend', months] as const,
  topItems: (limit: number) => [...dashboardKeys.all, 'top-items', limit] as const,
  topCustomers: (limit: number) => [...dashboardKeys.all, 'top-customers', limit] as const,
  alerts: () => [...dashboardKeys.all, 'alerts'] as const,
};

// ============ Queries ============

export function useDashboardOverview() {
  return useQuery<DashboardOverview>({
    queryKey: dashboardKeys.overview(),
    queryFn: () => dashboardService.getOverview(),
  });
}

export function useSalesTrend(months: number = 12) {
  return useQuery<SalesTrendData[]>({
    queryKey: dashboardKeys.salesTrend(months),
    queryFn: () => dashboardService.getSalesTrend(months),
  });
}

export function useTopItems(limit: number = 10) {
  return useQuery<TopItem[]>({
    queryKey: dashboardKeys.topItems(limit),
    queryFn: () => dashboardService.getTopItems(limit),
  });
}

export function useTopCustomers(limit: number = 10) {
  return useQuery<TopCustomer[]>({
    queryKey: dashboardKeys.topCustomers(limit),
    queryFn: () => dashboardService.getTopCustomers(limit),
  });
}

export function useDashboardAlerts() {
  return useQuery<DashboardAlerts>({
    queryKey: dashboardKeys.alerts(),
    queryFn: () => dashboardService.getAlerts(),
  });
}

export function useDashboardAlertsFlat() {
  return useQuery<DashboardAlert[]>({
    queryKey: [...dashboardKeys.alerts(), 'flat'],
    queryFn: () => dashboardService.getAlertsFlat(),
  });
}
