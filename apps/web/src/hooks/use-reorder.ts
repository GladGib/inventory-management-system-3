import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  reorderService,
  ReorderSettingsResponse,
  ReorderSuggestion,
  ReorderAlert,
  AlertQueryParams,
  DemandForecast,
  ReorderReport,
  UpdateReorderSettingsDto,
  BulkReorderSettingsDto,
  PaginatedResponse,
} from '@/lib/reorder';

// Query keys
export const reorderKeys = {
  all: ['reorder'] as const,
  settings: (itemId: string) => [...reorderKeys.all, 'settings', itemId] as const,
  suggestions: () => [...reorderKeys.all, 'suggestions'] as const,
  alerts: () => [...reorderKeys.all, 'alerts'] as const,
  alertList: (params: AlertQueryParams) => [...reorderKeys.alerts(), 'list', params] as const,
  forecast: (itemId: string) => [...reorderKeys.all, 'forecast', itemId] as const,
  report: () => [...reorderKeys.all, 'report'] as const,
};

// ============ Settings ============

export function useReorderSettings(itemId: string) {
  return useQuery<ReorderSettingsResponse>({
    queryKey: reorderKeys.settings(itemId),
    queryFn: () => reorderService.getReorderSettings(itemId),
    enabled: !!itemId,
  });
}

export function useUpdateReorderSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateReorderSettingsDto }) =>
      reorderService.updateReorderSettings(itemId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reorderKeys.settings(variables.itemId) });
      queryClient.invalidateQueries({ queryKey: reorderKeys.suggestions() });
      message.success('Reorder settings updated');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update reorder settings');
    },
  });
}

export function useBulkUpdateReorderSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkReorderSettingsDto) => reorderService.bulkUpdateReorderSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reorderKeys.all });
      message.success('Reorder settings updated in bulk');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to bulk update reorder settings');
    },
  });
}

// ============ Suggestions & Alerts ============

export function useReorderSuggestions() {
  return useQuery<ReorderSuggestion[]>({
    queryKey: reorderKeys.suggestions(),
    queryFn: () => reorderService.getReorderSuggestions(),
  });
}

export function useReorderAlerts(params?: AlertQueryParams) {
  return useQuery<PaginatedResponse<ReorderAlert>>({
    queryKey: reorderKeys.alertList(params || {}),
    queryFn: () => reorderService.getAlerts(params),
  });
}

export function useCheckReorderPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => reorderService.checkReorderPoints(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: reorderKeys.alerts() });
      queryClient.invalidateQueries({ queryKey: reorderKeys.suggestions() });
      message.success(`Reorder check complete. ${result.newAlerts} new alerts created.`);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to check reorder points');
    },
  });
}

export function useCreateAutoReorderPO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      alertId,
      overrides,
    }: {
      alertId: string;
      overrides?: { vendorId?: string; warehouseId?: string };
    }) => reorderService.createAutoReorderPO(alertId, overrides),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reorderKeys.alerts() });
      queryClient.invalidateQueries({ queryKey: reorderKeys.suggestions() });
      message.success('Purchase order created from alert');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create PO');
    },
  });
}

export function useBulkCreatePOs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertIds: string[]) => reorderService.bulkCreatePOs(alertIds),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: reorderKeys.alerts() });
      queryClient.invalidateQueries({ queryKey: reorderKeys.suggestions() });
      message.success(`${result.created} POs created. ${result.failed} failed.`);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to bulk create POs');
    },
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => reorderService.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reorderKeys.alerts() });
      message.success('Alert acknowledged');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to acknowledge alert');
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => reorderService.resolveAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reorderKeys.alerts() });
      message.success('Alert resolved');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to resolve alert');
    },
  });
}

// ============ Forecast & Report ============

export function useDemandForecast(itemId: string) {
  return useQuery<DemandForecast>({
    queryKey: reorderKeys.forecast(itemId),
    queryFn: () => reorderService.getDemandForecast(itemId),
    enabled: !!itemId,
  });
}

export function useReorderReport() {
  return useQuery<ReorderReport>({
    queryKey: reorderKeys.report(),
    queryFn: () => reorderService.getReorderReport(),
  });
}
