import { api } from './api';

// Types
export interface EmailSettings {
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  signature?: string;
  autoSendInvoice?: boolean;
  autoSendPayment?: boolean;
  autoSendOrder?: boolean;
  autoSendPO?: boolean;
}

export interface EmailLog {
  id: string;
  type: string;
  to: string;
  cc?: string;
  subject: string;
  status: string;
  sentAt?: string;
  error?: string;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
}

export interface EmailLogsResponse {
  data: EmailLog[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Service
export const emailService = {
  async getSettings(): Promise<EmailSettings> {
    const response = await api.get('/settings/email');
    return response.data;
  },

  async updateSettings(settings: EmailSettings): Promise<EmailSettings> {
    const response = await api.put('/settings/email', settings);
    return response.data;
  },

  async testConnection(): Promise<SendEmailResult> {
    const response = await api.post('/settings/email/test');
    return response.data;
  },

  async sendTestEmail(email: string): Promise<SendEmailResult> {
    const response = await api.post('/settings/email/send-test', { email });
    return response.data;
  },

  async getEmailLogs(params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }): Promise<EmailLogsResponse> {
    const response = await api.get('/emails/logs', { params });
    return response.data;
  },

  async sendInvoiceEmail(invoiceId: string): Promise<SendEmailResult> {
    const response = await api.post(`/sales/invoices/${invoiceId}/send`);
    return response.data;
  },

  async sendPaymentReceipt(paymentId: string): Promise<SendEmailResult> {
    const response = await api.post(`/sales/payments/${paymentId}/send`);
    return response.data;
  },

  async sendOrderConfirmation(orderId: string): Promise<SendEmailResult> {
    const response = await api.post(`/sales/orders/${orderId}/send`);
    return response.data;
  },

  async sendPOToVendor(poId: string): Promise<SendEmailResult> {
    const response = await api.post(`/purchases/orders/${poId}/send`);
    return response.data;
  },
};
