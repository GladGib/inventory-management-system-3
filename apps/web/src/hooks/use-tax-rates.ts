import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  taxRatesService,
  TaxRate,
  TaxRatesResponse,
  TaxRateQueryParams,
  CreateTaxRateDto,
  UpdateTaxRateDto,
  OrganizationTaxSettings,
  UpdateOrganizationTaxSettingsDto,
} from '@/lib/tax-rates';

// Query keys
export const taxRateKeys = {
  all: ['taxRates'] as const,
  lists: () => [...taxRateKeys.all, 'list'] as const,
  list: (params: TaxRateQueryParams) => [...taxRateKeys.lists(), params] as const,
  details: () => [...taxRateKeys.all, 'detail'] as const,
  detail: (id: string) => [...taxRateKeys.details(), id] as const,
  default: () => [...taxRateKeys.all, 'default'] as const,
  settings: () => [...taxRateKeys.all, 'settings'] as const,
};

// ============ Tax Rates Queries ============

export function useTaxRates(params?: TaxRateQueryParams) {
  return useQuery<TaxRatesResponse>({
    queryKey: taxRateKeys.list(params || {}),
    queryFn: () => taxRatesService.getTaxRates(params),
  });
}

export function useTaxRate(id: string) {
  return useQuery<TaxRate>({
    queryKey: taxRateKeys.detail(id),
    queryFn: () => taxRatesService.getTaxRate(id),
    enabled: !!id,
  });
}

export function useDefaultTaxRate() {
  return useQuery<TaxRate | null>({
    queryKey: taxRateKeys.default(),
    queryFn: () => taxRatesService.getDefaultTaxRate(),
  });
}

export function useActiveTaxRates() {
  return useQuery<TaxRatesResponse>({
    queryKey: taxRateKeys.list({ isActive: true, limit: 100 }),
    queryFn: () => taxRatesService.getTaxRates({ isActive: true, limit: 100 }),
  });
}

// ============ Tax Rates Mutations ============

export function useCreateTaxRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaxRateDto) => taxRatesService.createTaxRate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxRateKeys.lists() });
      message.success('Tax rate created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create tax rate');
    },
  });
}

export function useUpdateTaxRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaxRateDto }) =>
      taxRatesService.updateTaxRate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: taxRateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taxRateKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taxRateKeys.default() });
      message.success('Tax rate updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update tax rate');
    },
  });
}

export function useSetDefaultTaxRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taxRatesService.setDefaultTaxRate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxRateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taxRateKeys.default() });
      message.success('Default tax rate updated');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to set default tax rate');
    },
  });
}

export function useDeleteTaxRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taxRatesService.deleteTaxRate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxRateKeys.lists() });
      message.success('Tax rate deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to delete tax rate');
    },
  });
}

export function useInitializeTaxRates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => taxRatesService.initializeDefaultRates(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: taxRateKeys.lists() });
      message.success(result.message);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to initialize tax rates');
    },
  });
}

// ============ Organization Tax Settings ============

export function useTaxSettings() {
  return useQuery<OrganizationTaxSettings>({
    queryKey: taxRateKeys.settings(),
    queryFn: () => taxRatesService.getTaxSettings(),
  });
}

export function useUpdateTaxSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateOrganizationTaxSettingsDto) => taxRatesService.updateTaxSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxRateKeys.settings() });
      message.success('Tax settings updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update tax settings');
    },
  });
}
