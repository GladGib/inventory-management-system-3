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

export interface InitiatePaymentPayload {
  gateway: PaymentGateway;
  invoiceId: string;
  bankCode?: string;
  buyerEmail?: string;
  buyerName?: string;
}

export interface InitiatePaymentResponse {
  paymentId: string;
  referenceNumber: string;
  paymentUrl: string;
  amount: number;
  gateway: string;
}

export interface PaymentStatusResponse {
  id: string;
  gateway: string;
  status: OnlinePaymentStatus;
  amount: number;
  currency: string;
  referenceNumber: string;
  gatewayRef?: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    total: number;
    balance: number;
    paymentStatus: string;
  };
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

// ============ API Service ============

export const paymentsService = {
  /**
   * Initiate an online payment for an invoice.
   * Returns a payment URL to redirect the user to.
   */
  async initiatePayment(
    payload: InitiatePaymentPayload,
  ): Promise<InitiatePaymentResponse> {
    const { data } = await api.post('/payments/online/initiate', payload);
    return data;
  },

  /**
   * Check the status of an online payment.
   */
  async checkPaymentStatus(
    paymentId: string,
  ): Promise<PaymentStatusResponse> {
    const { data } = await api.get(`/payments/online/${paymentId}/status`);
    return data;
  },

  /**
   * Get available banks for a payment gateway (e.g., FPX).
   */
  async getBankList(gateway: string): Promise<BankInfo[]> {
    const { data } = await api.get(`/payments/online/banks/${gateway}`);
    return data;
  },
};
