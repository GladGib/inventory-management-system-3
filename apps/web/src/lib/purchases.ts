import { api } from './api';

// ============ Types ============

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CLOSED'
  | 'CANCELLED';
export type BillStatus =
  | 'DRAFT'
  | 'RECEIVED'
  | 'APPROVED'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'VOID';

export interface Vendor {
  id: string;
  displayName: string;
  companyName?: string;
  email?: string;
}

export interface PurchaseOrderItem {
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
  receivedQty: number;
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

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  vendorId: string;
  vendor: Vendor;
  orderDate: string;
  expectedDate?: string;
  status: PurchaseOrderStatus;
  receiveStatus: string;
  billStatus: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  discountAmount?: number;
  shippingCharges?: number;
  taxAmount: number;
  total: number;
  notes?: string;
  referenceNumber?: string;
  warehouseId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  purchaseOrderId?: string;
  purchaseOrder?: {
    id: string;
    orderNumber: string;
  };
  vendorId: string;
  vendor: Vendor;
  billDate: string;
  dueDate: string;
  status: BillStatus;
  items: PurchaseOrderItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balance: number;
  vendorInvoiceNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorPayment {
  id: string;
  paymentNumber: string;
  vendorId: string;
  vendor: Vendor;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  allocations: {
    billId: string;
    bill: {
      id: string;
      billNumber: string;
    };
    amount: number;
  }[];
  createdAt: string;
}

export interface PurchaseReceive {
  id: string;
  receiveNumber: string;
  purchaseOrderId: string;
  purchaseOrder: {
    id: string;
    orderNumber: string;
  };
  vendorId: string;
  vendor: Vendor;
  receiveDate: string;
  warehouseId: string;
  warehouse: {
    id: string;
    name: string;
  };
  status: string;
  items: {
    itemId: string;
    item: {
      id: string;
      sku: string;
      name: string;
    };
    quantityReceived: number;
  }[];
  createdAt: string;
}

// Query Parameters
export interface PurchaseOrderQueryParams {
  status?: PurchaseOrderStatus;
  vendorId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface BillQueryParams {
  status?: BillStatus;
  vendorId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface PaymentQueryParams {
  vendorId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface ReceiveQueryParams {
  vendorId?: string;
  purchaseOrderId?: string;
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
export interface PurchaseOrderItemDto {
  itemId: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxRateId?: string;
}

export interface CreatePurchaseOrderDto {
  vendorId: string;
  orderDate?: Date;
  expectedDate?: Date;
  items: PurchaseOrderItemDto[];
  discountAmount?: number;
  shippingCharges?: number;
  warehouseId?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface UpdatePurchaseOrderDto extends Partial<CreatePurchaseOrderDto> {}

export interface CreateBillDto {
  vendorId: string;
  purchaseOrderId?: string;
  billDate?: Date;
  dueDate?: Date;
  items: PurchaseOrderItemDto[];
  discountAmount?: number;
  vendorInvoiceNumber?: string;
  notes?: string;
}

export interface CreateVendorPaymentDto {
  vendorId: string;
  paymentDate?: Date;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  allocations: {
    billId: string;
    amount: number;
  }[];
}

export interface CreateReceiveDto {
  purchaseOrderId: string;
  receiveDate?: Date;
  warehouseId?: string;
  items: {
    itemId: string;
    quantityReceived: number;
  }[];
  notes?: string;
}

// ============ Vendor Credits Types ============

export type VendorCreditStatus = 'OPEN' | 'PARTIALLY_APPLIED' | 'FULLY_APPLIED' | 'VOID';

export interface VendorCreditItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  total: number;
}

export interface VendorCreditApplication {
  id: string;
  billId: string;
  bill: { billNumber: string; total: number };
  amount: number;
  appliedDate: string;
}

export interface VendorCredit {
  id: string;
  creditNumber: string;
  vendorId: string;
  vendor: Vendor;
  creditDate: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  balance: number;
  status: VendorCreditStatus;
  notes?: string;
  items: VendorCreditItem[];
  applications: VendorCreditApplication[];
  _count?: { applications: number };
  createdAt: string;
  updatedAt: string;
}

export interface VendorCreditQueryParams {
  status?: VendorCreditStatus;
  vendorId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface VendorCreditItemDto {
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount?: number;
}

export interface CreateVendorCreditDto {
  vendorId: string;
  creditDate?: Date;
  items: VendorCreditItemDto[];
  notes?: string;
}

export interface UpdateVendorCreditDto extends Partial<CreateVendorCreditDto> {}

export interface ApplyVendorCreditDto {
  applications: { billId: string; amount: number }[];
}

// ============ Service ============

export const purchasesService = {
  // Purchase Orders
  async getOrders(params?: PurchaseOrderQueryParams): Promise<PaginatedResponse<PurchaseOrder>> {
    const response = await api.get<PaginatedResponse<PurchaseOrder>>('/purchases/orders', {
      params,
    });
    return response.data;
  },

  async getOrder(id: string): Promise<PurchaseOrder> {
    const response = await api.get<PurchaseOrder>(`/purchases/orders/${id}`);
    return response.data;
  },

  async createOrder(data: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const response = await api.post<PurchaseOrder>('/purchases/orders', data);
    return response.data;
  },

  async updateOrder(id: string, data: UpdatePurchaseOrderDto): Promise<PurchaseOrder> {
    const response = await api.put<PurchaseOrder>(`/purchases/orders/${id}`, data);
    return response.data;
  },

  async issueOrder(id: string): Promise<PurchaseOrder> {
    const response = await api.put<PurchaseOrder>(`/purchases/orders/${id}/issue`);
    return response.data;
  },

  async cancelOrder(id: string): Promise<PurchaseOrder> {
    const response = await api.put<PurchaseOrder>(`/purchases/orders/${id}/cancel`);
    return response.data;
  },

  async createBillFromOrder(orderId: string): Promise<Bill> {
    const response = await api.post<Bill>(`/purchases/orders/${orderId}/bill`);
    return response.data;
  },

  // Receives
  async getReceives(params?: ReceiveQueryParams): Promise<PaginatedResponse<PurchaseReceive>> {
    const response = await api.get<PaginatedResponse<PurchaseReceive>>('/purchases/receives', {
      params,
    });
    return response.data;
  },

  async createReceive(data: CreateReceiveDto): Promise<PurchaseReceive> {
    const response = await api.post<PurchaseReceive>('/purchases/receives', data);
    return response.data;
  },

  // Bills
  async getBills(params?: BillQueryParams): Promise<PaginatedResponse<Bill>> {
    const response = await api.get<PaginatedResponse<Bill>>('/purchases/bills', { params });
    return response.data;
  },

  async getBill(id: string): Promise<Bill> {
    const response = await api.get<Bill>(`/purchases/bills/${id}`);
    return response.data;
  },

  async createBill(data: CreateBillDto): Promise<Bill> {
    const response = await api.post<Bill>('/purchases/bills', data);
    return response.data;
  },

  async approveBill(id: string): Promise<Bill> {
    const response = await api.put<Bill>(`/purchases/bills/${id}/approve`);
    return response.data;
  },

  async updateBill(id: string, data: CreateBillDto): Promise<Bill> {
    const response = await api.put<Bill>(`/purchases/bills/${id}`, data);
    return response.data;
  },

  async voidBill(id: string): Promise<Bill> {
    const response = await api.put<Bill>(`/purchases/bills/${id}/void`);
    return response.data;
  },

  // Payments
  async getPayments(params?: PaymentQueryParams): Promise<PaginatedResponse<VendorPayment>> {
    const response = await api.get<PaginatedResponse<VendorPayment>>('/purchases/payments', {
      params,
    });
    return response.data;
  },

  async createPayment(data: CreateVendorPaymentDto): Promise<VendorPayment> {
    const response = await api.post<VendorPayment>('/purchases/payments', data);
    return response.data;
  },

  async getPayment(id: string): Promise<VendorPayment> {
    const response = await api.get<VendorPayment>(`/purchases/payments/${id}`);
    return response.data;
  },

  async getVendorOpenBills(vendorId: string): Promise<Bill[]> {
    const response = await api.get<Bill[]>(`/purchases/bills/vendor/${vendorId}/open`);
    return response.data;
  },

  // Vendor Credits
  async getVendorCredits(
    params?: VendorCreditQueryParams
  ): Promise<PaginatedResponse<VendorCredit>> {
    const response = await api.get<PaginatedResponse<VendorCredit>>('/purchases/credits', {
      params,
    });
    return response.data;
  },

  async getVendorCredit(id: string): Promise<VendorCredit> {
    const response = await api.get<VendorCredit>(`/purchases/credits/${id}`);
    return response.data;
  },

  async createVendorCredit(data: CreateVendorCreditDto): Promise<VendorCredit> {
    const response = await api.post<VendorCredit>('/purchases/credits', data);
    return response.data;
  },

  async updateVendorCredit(id: string, data: UpdateVendorCreditDto): Promise<VendorCredit> {
    const response = await api.put<VendorCredit>(`/purchases/credits/${id}`, data);
    return response.data;
  },

  async deleteVendorCredit(id: string): Promise<void> {
    await api.delete(`/purchases/credits/${id}`);
  },

  async voidVendorCredit(id: string): Promise<VendorCredit> {
    const response = await api.put<VendorCredit>(`/purchases/credits/${id}/void`);
    return response.data;
  },

  async applyVendorCredit(id: string, data: ApplyVendorCreditDto): Promise<VendorCredit> {
    const response = await api.post<VendorCredit>(`/purchases/credits/${id}/apply`, data);
    return response.data;
  },

  async getVendorCreditApplicationHistory(id: string): Promise<VendorCreditApplication[]> {
    const response = await api.get<VendorCreditApplication[]>(
      `/purchases/credits/${id}/applications`
    );
    return response.data;
  },
};
