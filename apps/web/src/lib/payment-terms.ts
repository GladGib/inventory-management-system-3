import { api } from './api';

// Types
export interface PaymentTerm {
  id: string;
  organizationId: string;
  name: string;
  days: number;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentTermDto {
  name: string;
  days: number;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdatePaymentTermDto extends Partial<CreatePaymentTermDto> {}

// Service
export const paymentTermsService = {
  async getPaymentTerms(): Promise<PaymentTerm[]> {
    const response = await api.get<PaymentTerm[]>('/settings/payment-terms');
    return response.data;
  },

  async getPaymentTerm(id: string): Promise<PaymentTerm> {
    const response = await api.get<PaymentTerm>(`/settings/payment-terms/${id}`);
    return response.data;
  },

  async createPaymentTerm(data: CreatePaymentTermDto): Promise<PaymentTerm> {
    const response = await api.post<PaymentTerm>('/settings/payment-terms', data);
    return response.data;
  },

  async updatePaymentTerm(id: string, data: UpdatePaymentTermDto): Promise<PaymentTerm> {
    const response = await api.put<PaymentTerm>(`/settings/payment-terms/${id}`, data);
    return response.data;
  },

  async deletePaymentTerm(id: string): Promise<void> {
    await api.delete(`/settings/payment-terms/${id}`);
  },

  async setDefaultPaymentTerm(id: string): Promise<PaymentTerm> {
    const response = await api.put<PaymentTerm>(`/settings/payment-terms/${id}/default`);
    return response.data;
  },

  async seedDefaultPaymentTerms(): Promise<PaymentTerm[]> {
    const response = await api.post<PaymentTerm[]>('/settings/payment-terms/seed-defaults');
    return response.data;
  },
};

// Utility function to calculate due date
export function calculateDueDate(invoiceDate: Date | string, paymentTerm: PaymentTerm): Date {
  const date = new Date(invoiceDate);
  date.setDate(date.getDate() + paymentTerm.days);
  return date;
}
