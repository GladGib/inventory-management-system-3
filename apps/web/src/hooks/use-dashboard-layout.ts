import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { api } from '@/lib/api';

// Types
export interface WidgetConfig {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
  settings?: Record<string, unknown>;
}

export interface DashboardLayoutData {
  layoutConfig: WidgetConfig[];
  widgetSettings: Record<string, unknown>;
}

// Default layout matching the current dashboard
export const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: 'sales-kpi', type: 'sales-kpi', x: 0, y: 0, w: 6, h: 2, visible: true },
  { id: 'inventory-kpi', type: 'inventory', x: 6, y: 0, w: 3, h: 2, visible: true },
  { id: 'pending-orders', type: 'pending-orders', x: 9, y: 0, w: 3, h: 2, visible: true },
  { id: 'receivables', type: 'receivables', x: 0, y: 2, w: 3, h: 2, visible: true },
  { id: 'payables', type: 'payables', x: 3, y: 2, w: 3, h: 2, visible: true },
  { id: 'cash-flow', type: 'cash-flow', x: 6, y: 2, w: 6, h: 2, visible: true },
  { id: 'sales-chart', type: 'sales-chart', x: 0, y: 4, w: 6, h: 4, visible: true },
  { id: 'top-items', type: 'top-items', x: 6, y: 4, w: 6, h: 4, visible: true },
  { id: 'top-customers', type: 'top-customers', x: 0, y: 8, w: 6, h: 4, visible: true },
  { id: 'pending-actions', type: 'pending-actions', x: 6, y: 8, w: 6, h: 4, visible: true },
  { id: 'recent-activity', type: 'recent-activity', x: 0, y: 12, w: 12, h: 4, visible: true },
  { id: 'low-stock', type: 'low-stock', x: 0, y: 16, w: 6, h: 4, visible: false },
  { id: 'reorder-alerts', type: 'reorder-alerts', x: 6, y: 16, w: 6, h: 4, visible: false },
];

// Query keys
export const dashboardLayoutKeys = {
  all: ['dashboard-layout'] as const,
  layout: () => [...dashboardLayoutKeys.all, 'layout'] as const,
};

// Service
const dashboardLayoutService = {
  async getLayout(): Promise<DashboardLayoutData> {
    const response = await api.get('/dashboard/layout');
    return response.data;
  },

  async saveLayout(data: DashboardLayoutData): Promise<DashboardLayoutData> {
    const response = await api.put('/dashboard/layout', data);
    return response.data;
  },
};

// ============ Queries ============

export function useDashboardLayout() {
  return useQuery<DashboardLayoutData>({
    queryKey: dashboardLayoutKeys.layout(),
    queryFn: () => dashboardLayoutService.getLayout(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============ Mutations ============

export function useSaveDashboardLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DashboardLayoutData) => dashboardLayoutService.saveLayout(data),
    onSuccess: (data) => {
      queryClient.setQueryData(dashboardLayoutKeys.layout(), data);
      message.success('Dashboard layout saved');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to save layout');
    },
  });
}

export function useResetDashboardLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      dashboardLayoutService.saveLayout({
        layoutConfig: DEFAULT_LAYOUT,
        widgetSettings: {},
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(dashboardLayoutKeys.layout(), data);
      message.success('Dashboard layout reset to default');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to reset layout');
    },
  });
}
