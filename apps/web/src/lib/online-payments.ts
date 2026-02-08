import { api } from './api';

// ============ Types ============

export type PaymentGateway = 'FPX' | 'DUITNOW' | 'GRABPAY' | 'TNG';
export type OnlinePaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'EXPIRED';

export interface BankInfo {
  code: string;
  name: string;
  active: boolean;
}

export interface InitiatePaymentDto {
  gateway: PaymentGateway;
  invoiceId: string;
  bankCode?: string;
  buyerEmail?: string;
  buyerName?: string;
}

export interface InitiatePaymentResult {
  paymentId: string;
  referenceNumber: string;
  paymentUrl: string;
  amount: number;
  gateway: string;
}

export interface OnlinePaymentStatusResult {
  id: string;
  gateway: PaymentGateway;
  status: OnlinePaymentStatus;
  amount: number;
  currency: string;
  referenceNumber: string;
  gatewayRef: string | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    total: number;
    balance: number;
    paymentStatus: string;
  } | null;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

// ============ Service ============

export const onlinePaymentService = {
  async getBanks(gateway: string): Promise<BankInfo[]> {
    const response = await api.get<BankInfo[]>(
      `/payments/online/banks/${gateway}`,
    );
    return response.data;
  },

  async initiatePayment(
    data: InitiatePaymentDto,
  ): Promise<InitiatePaymentResult> {
    const response = await api.post<InitiatePaymentResult>(
      '/payments/online/initiate',
      data,
    );
    return response.data;
  },

  async checkStatus(paymentId: string): Promise<OnlinePaymentStatusResult> {
    const response = await api.get<OnlinePaymentStatusResult>(
      `/payments/online/${paymentId}/status`,
    );
    return response.data;
  },
};
