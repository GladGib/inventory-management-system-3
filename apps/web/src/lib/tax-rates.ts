import { api } from './api';

// ============ Types ============

export type TaxType = 'SST' | 'SERVICE_TAX' | 'GST' | 'EXEMPT' | 'ZERO_RATED' | 'OUT_OF_SCOPE';
export type TaxRegime = 'GST' | 'TAX_HOLIDAY' | 'SST';
export type RoundingMethod = 'NORMAL' | 'ROUND_DOWN' | 'ROUND_UP';

export interface TaxRate {
  id: string;
  name: string;
  code: string;
  rate: number;
  type: TaxType;
  taxRegime?: TaxRegime | null;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  effectiveFrom?: string;
  effectiveTo?: string;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationTaxSettings {
  id: string;
  organizationId: string;
  isSstRegistered: boolean;
  sstRegistrationNo: string | null;
  sstRegisteredDate: string | null;
  sstThreshold: number | null;
  defaultSalesTaxId: string | null;
  defaultPurchaseTaxId: string | null;
  taxInclusive: boolean;
  roundingMethod: RoundingMethod;
  defaultSalesTax?: {
    id: string;
    name: string;
    code: string;
    rate: number;
  } | null;
  defaultPurchaseTax?: {
    id: string;
    name: string;
    code: string;
    rate: number;
  } | null;
}

export interface TaxRatesResponse {
  data: TaxRate[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TaxRateQueryParams {
  type?: TaxType;
  status?: 'ACTIVE' | 'INACTIVE';
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateTaxRateDto {
  name: string;
  code: string;
  rate: number;
  type: TaxType;
  taxRegime?: TaxRegime | null;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface UpdateTaxRateDto extends Partial<CreateTaxRateDto> {}

export interface UpdateOrganizationTaxSettingsDto {
  isSstRegistered?: boolean;
  sstRegistrationNo?: string;
  sstRegisteredDate?: string;
  sstThreshold?: number;
  defaultSalesTaxId?: string;
  defaultPurchaseTaxId?: string;
  taxInclusive?: boolean;
  roundingMethod?: RoundingMethod;
}

export interface TaxBreakdownItem {
  taxRateId: string;
  taxRateName: string;
  taxRateCode: string;
  rate: number;
  taxableAmount: number;
  taxAmount: number;
}

export interface TaxCalculationResult {
  subtotal: number;
  taxAmount: number;
  total: number;
  taxBreakdown: TaxBreakdownItem[];
}

// ============ Tax Type Labels and Colors ============

export const TAX_TYPE_LABELS: Record<TaxType, string> = {
  SST: 'Sales Tax',
  SERVICE_TAX: 'Service Tax',
  GST: 'GST',
  ZERO_RATED: 'Zero Rated',
  EXEMPT: 'Exempt',
  OUT_OF_SCOPE: 'Out of Scope',
};

export const TAX_TYPE_COLORS: Record<TaxType, string> = {
  SST: 'blue',
  SERVICE_TAX: 'green',
  GST: 'purple',
  ZERO_RATED: 'orange',
  EXEMPT: 'default',
  OUT_OF_SCOPE: 'default',
};

export const TAX_REGIME_LABELS: Record<TaxRegime, string> = {
  GST: 'GST Era (Apr 2015 - Aug 2018)',
  TAX_HOLIDAY: 'Tax Holiday (Sep - Dec 2018)',
  SST: 'SST Era (Jan 2019 - present)',
};

export const TAX_REGIME_COLORS: Record<TaxRegime, string> = {
  GST: 'purple',
  TAX_HOLIDAY: 'gold',
  SST: 'blue',
};

export const ROUNDING_METHOD_LABELS: Record<RoundingMethod, string> = {
  NORMAL: 'Normal Rounding',
  ROUND_DOWN: 'Always Round Down',
  ROUND_UP: 'Always Round Up',
};

// ============ Service ============

export const taxRatesService = {
  // Tax Rates CRUD
  async getTaxRates(params?: TaxRateQueryParams): Promise<TaxRatesResponse> {
    const response = await api.get<TaxRatesResponse>('/tax/rates', { params });
    return response.data;
  },

  async getTaxRate(id: string): Promise<TaxRate> {
    const response = await api.get<TaxRate>(`/tax/rates/${id}`);
    return response.data;
  },

  async getDefaultTaxRate(): Promise<TaxRate | null> {
    const response = await api.get<TaxRate | null>('/tax/rates/default');
    return response.data;
  },

  async createTaxRate(data: CreateTaxRateDto): Promise<TaxRate> {
    const response = await api.post<TaxRate>('/tax/rates', data);
    return response.data;
  },

  async updateTaxRate(id: string, data: UpdateTaxRateDto): Promise<TaxRate> {
    const response = await api.put<TaxRate>(`/tax/rates/${id}`, data);
    return response.data;
  },

  async setDefaultTaxRate(id: string): Promise<TaxRate> {
    const response = await api.patch<TaxRate>(`/tax/rates/${id}/default`);
    return response.data;
  },

  async deleteTaxRate(id: string): Promise<void> {
    await api.delete(`/tax/rates/${id}`);
  },

  async initializeDefaultRates(): Promise<{ message: string; created: number; rates: TaxRate[] }> {
    const response = await api.post<{ message: string; created: number; rates: TaxRate[] }>(
      '/tax/rates/initialize'
    );
    return response.data;
  },

  // Organization Tax Settings
  async getTaxSettings(): Promise<OrganizationTaxSettings> {
    const response = await api.get<OrganizationTaxSettings>('/tax/settings');
    return response.data;
  },

  async updateTaxSettings(
    data: UpdateOrganizationTaxSettingsDto
  ): Promise<OrganizationTaxSettings> {
    const response = await api.put<OrganizationTaxSettings>('/tax/settings', data);
    return response.data;
  },

  // Tax Calculation
  async calculateTax(
    lineItems: { amount: number; taxRateId?: string }[]
  ): Promise<TaxCalculationResult> {
    const response = await api.post<TaxCalculationResult>('/tax/calculate', { lineItems });
    return response.data;
  },
};
