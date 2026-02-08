import { api } from './api';

// ============ Types ============

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'REJECTED' | 'CONVERTED';
export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Customer {
  id: string;
  displayName: string;
  companyName?: string;
  email?: string;
}

export interface QuoteItem {
  id: string;
  itemId: string;
  item: {
    id: string;
    sku: string;
    name: string;
    unit: string;
  };
  description?: string;
  quantity: number;
  unit: string;
  rate: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxRateId?: string;
  taxAmount: number;
  amount: number;
  sortOrder: number;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  customerId?: string;
  customer?: Customer;
  contactPersonName?: string;
  quoteDate: string;
  validUntil: string;
  status: QuoteStatus;
  salesPersonId?: string;
  warehouseId?: string;
  referenceNumber?: string;
  items: QuoteItem[];
  subtotal: number;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  notes?: string;
  termsConditions?: string;
  convertedToOrderId?: string;
  _count?: { items: number };
  createdAt: string;
  updatedAt: string;
}

// Query Parameters
export interface QuoteQueryParams {
  status?: QuoteStatus;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// Response Types
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// DTOs
export interface QuoteItemDto {
  itemId: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxRateId?: string;
}

export interface CreateQuoteDto {
  customerId?: string;
  contactPersonName?: string;
  quoteDate?: Date;
  validUntil: Date;
  items: QuoteItemDto[];
  discountType?: DiscountType;
  discountValue?: number;
  warehouseId?: string;
  salesPersonId?: string;
  referenceNumber?: string;
  notes?: string;
  termsConditions?: string;
}

export interface UpdateQuoteDto extends Partial<CreateQuoteDto> {}

// ============ Service ============

export const quotesService = {
  async getQuotes(params?: QuoteQueryParams): Promise<PaginatedResponse<Quote>> {
    const response = await api.get<PaginatedResponse<Quote>>('/sales/quotes', { params });
    return response.data;
  },

  async getQuote(id: string): Promise<Quote> {
    const response = await api.get<Quote>(`/sales/quotes/${id}`);
    return response.data;
  },

  async createQuote(data: CreateQuoteDto): Promise<Quote> {
    const response = await api.post<Quote>('/sales/quotes', data);
    return response.data;
  },

  async updateQuote(id: string, data: UpdateQuoteDto): Promise<Quote> {
    const response = await api.put<Quote>(`/sales/quotes/${id}`, data);
    return response.data;
  },

  async deleteQuote(id: string): Promise<void> {
    await api.delete(`/sales/quotes/${id}`);
  },

  async sendQuote(id: string): Promise<Quote> {
    const response = await api.post<Quote>(`/sales/quotes/${id}/send`);
    return response.data;
  },

  async convertToOrder(id: string): Promise<any> {
    const response = await api.post(`/sales/quotes/${id}/convert`);
    return response.data;
  },
};
