import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const portalApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add portal auth token
portalApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('portalAccessToken') : null;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor for token refresh
portalApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('portalRefreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Portal tokens use a different refresh mechanism;
        // For now, redirect to login since portal tokens are simpler
        throw new Error('Token expired');
      } catch (refreshError) {
        localStorage.removeItem('portalAccessToken');
        localStorage.removeItem('portalRefreshToken');
        if (typeof window !== 'undefined') {
          window.location.href = '/portal/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// ============ Types ============

export interface PortalUser {
  id: string;
  email: string;
  contactId: string;
  organizationId: string;
  contact: {
    id: string;
    displayName: string;
    companyName: string;
    email: string | null;
    phone: string | null;
  };
}

export interface PortalLoginCredentials {
  email: string;
  password: string;
  organizationSlug: string;
}

export interface PortalAuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
  user: PortalUser;
}

export interface PortalProfile extends PortalUser {
  lastLoginAt: string | null;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  contact: PortalUser['contact'] & {
    mobile: string | null;
    billingAddress: any;
    shippingAddress: any;
  };
}

export interface PortalOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  expectedShipDate: string | null;
  shippedDate: string | null;
  status: string;
  paymentStatus: string;
  shipmentStatus: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  _count: { items: number };
}

export interface PortalOrderDetail extends PortalOrder {
  items: Array<{
    id: string;
    itemId: string;
    description: string | null;
    quantity: number;
    unit: string;
    rate: number;
    discountAmount: number;
    taxAmount: number;
    amount: number;
    item: {
      sku: string;
      name: string;
      unit: string;
      images: string[];
    };
  }>;
  warehouse: { name: string } | null;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    total: number;
    balance: number;
    invoiceDate: string;
    dueDate: string;
  }>;
}

export interface PortalInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balance: number;
  salesOrder: { orderNumber: string } | null;
}

export interface PortalInvoiceDetail extends PortalInvoice {
  items: Array<{
    id: string;
    description: string | null;
    quantity: number;
    unit: string;
    rate: number;
    discountAmount: number;
    taxAmount: number;
    amount: number;
    item: {
      sku: string;
      name: string;
      unit: string;
    };
  }>;
  paymentAllocations: Array<{
    id: string;
    amount: number;
    payment: {
      paymentNumber: string;
      paymentDate: string;
      amount: number;
      paymentMethod: string;
    };
  }>;
  organization: {
    name: string;
    email: string | null;
    phone: string | null;
    address: any;
    sstNumber: string | null;
    businessRegNo: string | null;
  };
}

export interface PortalPayment {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
  allocations: Array<{
    invoice: {
      invoiceNumber: string;
      total: number;
    };
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StatementEntry {
  date: string;
  type: 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE';
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface Statement {
  contact: {
    displayName: string;
    companyName: string;
    email: string | null;
    billingAddress: any;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  entries: StatementEntry[];
  summary: {
    totalInvoiced: number;
    totalPaid: number;
    totalCredits: number;
    closingBalance: number;
    totalOutstanding: number;
  };
  outstandingInvoices: Array<{
    invoiceNumber: string;
    dueDate: string;
    total: number;
    balance: number;
  }>;
}

export interface DashboardSummary {
  summary: {
    totalOutstanding: number;
    totalOverdue: number;
    overdueCount: number;
    orderCount: number;
    invoiceCount: number;
    paymentCount: number;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    orderDate: string;
    status: string;
    total: number;
  }>;
  outstandingInvoices: Array<{
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    total: number;
    balance: number;
    status: string;
  }>;
  recentPayments: Array<{
    id: string;
    paymentNumber: string;
    paymentDate: string;
    amount: number;
    paymentMethod: string;
  }>;
}

// ============ API Functions ============

export const portalAuthService = {
  async login(credentials: PortalLoginCredentials): Promise<PortalAuthResponse> {
    const response = await portalApi.post<PortalAuthResponse>('/portal/auth/login', credentials);
    const data = response.data;
    localStorage.setItem('portalAccessToken', data.accessToken);
    localStorage.setItem('portalRefreshToken', data.refreshToken);
    return data;
  },

  async getProfile(): Promise<PortalProfile> {
    const response = await portalApi.get<PortalProfile>('/portal/auth/profile');
    return response.data;
  },

  logout(): void {
    localStorage.removeItem('portalAccessToken');
    localStorage.removeItem('portalRefreshToken');
  },

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('portalAccessToken');
  },
};

export const portalCustomerService = {
  async getDashboard(): Promise<DashboardSummary> {
    const response = await portalApi.get<DashboardSummary>('/portal/customer/dashboard');
    return response.data;
  },

  async getOrders(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<PortalOrder>> {
    const response = await portalApi.get<PaginatedResponse<PortalOrder>>('/portal/customer/orders', {
      params,
    });
    return response.data;
  },

  async getOrderDetail(id: string): Promise<PortalOrderDetail> {
    const response = await portalApi.get<PortalOrderDetail>(`/portal/customer/orders/${id}`);
    return response.data;
  },

  async getInvoices(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<PortalInvoice>> {
    const response = await portalApi.get<PaginatedResponse<PortalInvoice>>('/portal/customer/invoices', {
      params,
    });
    return response.data;
  },

  async getInvoiceDetail(id: string): Promise<PortalInvoiceDetail> {
    const response = await portalApi.get<PortalInvoiceDetail>(`/portal/customer/invoices/${id}`);
    return response.data;
  },

  async getPayments(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<PortalPayment>> {
    const response = await portalApi.get<PaginatedResponse<PortalPayment>>('/portal/customer/payments', {
      params,
    });
    return response.data;
  },

  async getStatement(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Statement> {
    const response = await portalApi.get<Statement>('/portal/customer/statement', {
      params,
    });
    return response.data;
  },
};
