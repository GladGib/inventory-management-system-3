import { api } from './api';

// ============ Types ============

export type SalesOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CLOSED'
  | 'CANCELLED';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'VOID';
export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Customer {
  id: string;
  displayName: string;
  companyName?: string;
  email?: string;
}

export interface SalesOrderItem {
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
  unitPrice: number;
  discountPercent?: number;
  taxRateId?: string;
  taxRate?: {
    id: string;
    name: string;
    rate: number;
  };
  amount: number;
  taxAmount: number;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: Customer;
  orderDate: string;
  expectedShipDate?: string;
  status: SalesOrderStatus;
  invoiceStatus: string;
  paymentStatus: string;
  items: SalesOrderItem[];
  subtotal: number;
  discountType?: DiscountType;
  discountValue?: number;
  discount: number;
  shippingCharges?: number;
  taxAmount: number;
  total: number;
  notes?: string;
  termsConditions?: string;
  salesPersonId?: string;
  warehouseId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  salesOrderId?: string;
  salesOrder?: {
    id: string;
    orderNumber: string;
  };
  customerId: string;
  customer: Customer;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  items: SalesOrderItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balance: number;
  eInvoiceId?: string;
  eInvoiceStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  customerId: string;
  customer: Customer;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  allocations: {
    invoiceId: string;
    invoice: {
      id: string;
      invoiceNumber: string;
    };
    amount: number;
  }[];
  createdAt: string;
}

// Query Parameters
export interface SalesOrderQueryParams {
  status?: SalesOrderStatus;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface InvoiceQueryParams {
  status?: InvoiceStatus;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface PaymentQueryParams {
  customerId?: string;
  fromDate?: string;
  toDate?: string;
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
export interface SalesOrderItemDto {
  itemId: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxRateId?: string;
}

export interface CreateSalesOrderDto {
  customerId: string;
  orderDate?: Date;
  expectedShipDate?: Date;
  items: SalesOrderItemDto[];
  discountType?: DiscountType;
  discountValue?: number;
  shippingCharges?: number;
  warehouseId?: string;
  salesPersonId?: string;
  notes?: string;
  termsConditions?: string;
}

export interface UpdateSalesOrderDto extends Partial<CreateSalesOrderDto> {}

export interface CreateInvoiceDto {
  customerId: string;
  salesOrderId?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  items: SalesOrderItemDto[];
  discountType?: DiscountType;
  discountValue?: number;
  notes?: string;
}

export interface CreatePaymentDto {
  customerId: string;
  paymentDate?: Date;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  allocations: {
    invoiceId: string;
    amount: number;
  }[];
}

// ============ Sales Returns Types ============

export type ReturnStatus = 'PENDING' | 'APPROVED' | 'RECEIVED' | 'PROCESSED' | 'REJECTED';
export type ReturnReason =
  | 'DEFECTIVE'
  | 'WRONG_ITEM'
  | 'CHANGED_MIND'
  | 'NOT_AS_DESCRIBED'
  | 'QUALITY_ISSUE'
  | 'DUPLICATE_ORDER'
  | 'OTHER';
export type ItemCondition = 'GOOD' | 'DAMAGED' | 'DEFECTIVE';
export type CreditNoteStatus = 'OPEN' | 'PARTIALLY_APPLIED' | 'FULLY_APPLIED' | 'VOID';

export interface SalesReturnItem {
  id: string;
  itemId: string;
  item: {
    id: string;
    sku: string;
    name: string;
    unit?: string;
  };
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  total: number;
  condition: ItemCondition;
  restocked: boolean;
}

export interface SalesReturn {
  id: string;
  returnNumber: string;
  customerId: string;
  customer: Customer;
  invoiceId?: string;
  invoice?: { id: string; invoiceNumber: string };
  salesOrderId?: string;
  salesOrder?: { id: string; orderNumber: string };
  returnDate: string;
  status: ReturnStatus;
  reason: ReturnReason;
  notes?: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  warehouseId?: string;
  warehouse?: { id: string; name: string };
  restockItems: boolean;
  creditNoteId?: string;
  creditNote?: { id: string; creditNumber: string; total: number };
  items: SalesReturnItem[];
  _count?: { items: number };
  createdAt: string;
  updatedAt: string;
}

export interface CreditNoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  total: number;
}

export interface CreditNoteApplication {
  id: string;
  invoiceId: string;
  invoice: { invoiceNumber: string; total: number };
  amount: number;
  appliedDate: string;
}

export interface CreditNote {
  id: string;
  creditNumber: string;
  customerId: string;
  customer: Customer;
  creditDate: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  balance: number;
  status: CreditNoteStatus;
  notes?: string;
  items: CreditNoteItem[];
  applications: CreditNoteApplication[];
  _count?: { applications: number };
  createdAt: string;
  updatedAt: string;
}

export interface SalesReturnQueryParams {
  status?: ReturnStatus;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface CreditNoteQueryParams {
  status?: CreditNoteStatus;
  customerId?: string;
  page?: number;
  limit?: number;
}

export interface SalesReturnItemDto {
  itemId: string;
  quantity: number;
  unitPrice: number;
  taxAmount?: number;
  condition?: ItemCondition;
}

export interface CreateSalesReturnDto {
  customerId: string;
  invoiceId?: string;
  salesOrderId?: string;
  returnDate?: Date;
  reason: ReturnReason;
  notes?: string;
  warehouseId?: string;
  restockItems?: boolean;
  items: SalesReturnItemDto[];
}

export interface UpdateSalesReturnDto extends Partial<CreateSalesReturnDto> {}

export interface ApplyCreditNoteDto {
  applications: { invoiceId: string; amount: number }[];
}

// ============ Service ============

export const salesService = {
  // Sales Orders
  async getOrders(params?: SalesOrderQueryParams): Promise<PaginatedResponse<SalesOrder>> {
    const response = await api.get<PaginatedResponse<SalesOrder>>('/sales/orders', { params });
    return response.data;
  },

  async getOrder(id: string): Promise<SalesOrder> {
    const response = await api.get<SalesOrder>(`/sales/orders/${id}`);
    return response.data;
  },

  async createOrder(data: CreateSalesOrderDto): Promise<SalesOrder> {
    const response = await api.post<SalesOrder>('/sales/orders', data);
    return response.data;
  },

  async updateOrder(id: string, data: UpdateSalesOrderDto): Promise<SalesOrder> {
    const response = await api.put<SalesOrder>(`/sales/orders/${id}`, data);
    return response.data;
  },

  async confirmOrder(id: string): Promise<SalesOrder> {
    const response = await api.put<SalesOrder>(`/sales/orders/${id}/confirm`);
    return response.data;
  },

  async shipOrder(id: string): Promise<SalesOrder> {
    const response = await api.put<SalesOrder>(`/sales/orders/${id}/ship`);
    return response.data;
  },

  async cancelOrder(id: string): Promise<SalesOrder> {
    const response = await api.put<SalesOrder>(`/sales/orders/${id}/cancel`);
    return response.data;
  },

  async createInvoiceFromOrder(orderId: string): Promise<Invoice> {
    const response = await api.post<Invoice>(`/sales/orders/${orderId}/invoice`);
    return response.data;
  },

  // Invoices
  async getInvoices(params?: InvoiceQueryParams): Promise<PaginatedResponse<Invoice>> {
    const response = await api.get<PaginatedResponse<Invoice>>('/sales/invoices', { params });
    return response.data;
  },

  async getInvoice(id: string): Promise<Invoice> {
    const response = await api.get<Invoice>(`/sales/invoices/${id}`);
    return response.data;
  },

  async createInvoice(data: CreateInvoiceDto): Promise<Invoice> {
    const response = await api.post<Invoice>('/sales/invoices', data);
    return response.data;
  },

  async sendInvoice(id: string): Promise<Invoice> {
    const response = await api.put<Invoice>(`/sales/invoices/${id}/send`);
    return response.data;
  },

  async voidInvoice(id: string): Promise<Invoice> {
    const response = await api.put<Invoice>(`/sales/invoices/${id}/void`);
    return response.data;
  },

  // Payments
  async getPayments(params?: PaymentQueryParams): Promise<PaginatedResponse<Payment>> {
    const response = await api.get<PaginatedResponse<Payment>>('/sales/payments', { params });
    return response.data;
  },

  async getPayment(id: string): Promise<Payment> {
    const response = await api.get<Payment>(`/sales/payments/${id}`);
    return response.data;
  },

  async createPayment(data: CreatePaymentDto): Promise<Payment> {
    const response = await api.post<Payment>('/sales/payments', data);
    return response.data;
  },

  // Sales Returns
  async getSalesReturns(params?: SalesReturnQueryParams): Promise<PaginatedResponse<SalesReturn>> {
    const response = await api.get<PaginatedResponse<SalesReturn>>('/sales/returns', { params });
    return response.data;
  },

  async getSalesReturn(id: string): Promise<SalesReturn> {
    const response = await api.get<SalesReturn>(`/sales/returns/${id}`);
    return response.data;
  },

  async createSalesReturn(data: CreateSalesReturnDto): Promise<SalesReturn> {
    const response = await api.post<SalesReturn>('/sales/returns', data);
    return response.data;
  },

  async updateSalesReturn(id: string, data: UpdateSalesReturnDto): Promise<SalesReturn> {
    const response = await api.put<SalesReturn>(`/sales/returns/${id}`, data);
    return response.data;
  },

  async approveSalesReturn(id: string): Promise<SalesReturn> {
    const response = await api.put<SalesReturn>(`/sales/returns/${id}/approve`);
    return response.data;
  },

  async receiveSalesReturn(id: string): Promise<SalesReturn> {
    const response = await api.put<SalesReturn>(`/sales/returns/${id}/receive`);
    return response.data;
  },

  async processSalesReturn(id: string): Promise<SalesReturn> {
    const response = await api.put<SalesReturn>(`/sales/returns/${id}/process`);
    return response.data;
  },

  async rejectSalesReturn(id: string): Promise<SalesReturn> {
    const response = await api.put<SalesReturn>(`/sales/returns/${id}/reject`);
    return response.data;
  },

  // Credit Notes
  async getCreditNotes(params?: CreditNoteQueryParams): Promise<PaginatedResponse<CreditNote>> {
    const response = await api.get<PaginatedResponse<CreditNote>>('/sales/returns/credit-notes', {
      params,
    });
    return response.data;
  },

  async getCreditNote(id: string): Promise<CreditNote> {
    const response = await api.get<CreditNote>(`/sales/returns/credit-notes/${id}`);
    return response.data;
  },

  async applyCreditNote(id: string, data: ApplyCreditNoteDto): Promise<CreditNote> {
    const response = await api.post<CreditNote>(`/sales/returns/credit-notes/${id}/apply`, data);
    return response.data;
  },
};
