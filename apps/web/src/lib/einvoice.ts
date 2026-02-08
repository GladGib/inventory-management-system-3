import { api } from './api';

// Types
export interface EInvoiceSettings {
  id: string;
  organizationId: string;
  tin?: string | null;
  brn?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  certificatePath?: string | null;
  isProduction: boolean;
  isEnabled: boolean;
  autoSubmit: boolean;
  lastConnectionCheck?: string | null;
  connectionStatus?: string | null;
}

export interface UpdateEInvoiceSettingsPayload {
  tin?: string;
  brn?: string;
  clientId?: string;
  clientSecret?: string;
  certificatePath?: string;
  isProduction?: boolean;
  isEnabled?: boolean;
  autoSubmit?: boolean;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  environment?: string;
  timestamp: string;
}

export interface EInvoiceSubmissionResult {
  invoiceId: string;
  submissionId: string;
  status: string;
  qrCode?: string;
  validationErrors?: string[];
  submittedAt?: string;
}

export interface EInvoiceSubmission {
  id: string;
  invoiceId: string;
  submissionUuid?: string;
  documentUuid?: string;
  longId?: string;
  status: string;
  submittedAt?: string;
  validatedAt?: string;
  cancelledAt?: string;
  rejectionReasons?: Record<string, unknown>;
  qrCodeUrl?: string;
  retryCount: number;
  lastError?: string;
  createdAt: string;
  // Enriched fields
  invoiceNumber: string;
  invoiceTotal: number;
  customerName: string;
}

export interface SubmissionsResponse {
  data: EInvoiceSubmission[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ComplianceDashboard {
  summary: {
    totalSubmitted: number;
    validated: number;
    rejected: number;
    pending: number;
    cancelled: number;
    submitted: number;
  };
  totalEligibleInvoices: number;
  pendingSubmission: number;
  recentSubmissions: Array<{
    id: string;
    invoiceId: string;
    status: string;
    submittedAt?: string;
    createdAt: string;
    invoiceNumber: string;
    customerName: string;
  }>;
}

export interface SubmissionFilters {
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface TinValidationResult {
  valid: boolean;
  message: string;
}

// Service
export const einvoiceService = {
  // Settings
  async getSettings(): Promise<EInvoiceSettings> {
    const response = await api.get('/einvoice/settings');
    return response.data;
  },

  async updateSettings(payload: UpdateEInvoiceSettingsPayload): Promise<EInvoiceSettings> {
    const response = await api.put('/einvoice/settings', payload);
    return response.data;
  },

  // Connection
  async testConnection(): Promise<ConnectionTestResult> {
    const response = await api.post('/einvoice/test-connection');
    return response.data;
  },

  // Submission
  async submitInvoice(invoiceId: string): Promise<EInvoiceSubmissionResult> {
    const response = await api.post(`/einvoice/submit/${invoiceId}`);
    return response.data;
  },

  async submitBatch(invoiceIds: string[]): Promise<EInvoiceSubmissionResult[]> {
    const response = await api.post('/einvoice/submit-batch', { invoiceIds });
    return response.data;
  },

  // Status
  async getStatus(
    invoiceId: string
  ): Promise<{ status: string; details?: Record<string, unknown> }> {
    const response = await api.get(`/einvoice/status/${invoiceId}`);
    return response.data;
  },

  // Cancel
  async cancelInvoice(
    invoiceId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/einvoice/cancel/${invoiceId}`, { reason });
    return response.data;
  },

  // QR Code
  async getQRCode(invoiceId: string): Promise<{ qrCode: string }> {
    const response = await api.get(`/einvoice/qrcode/${invoiceId}`);
    return response.data;
  },

  // Submissions list
  async getSubmissions(filters?: SubmissionFilters): Promise<SubmissionsResponse> {
    const response = await api.get('/einvoice/submissions', { params: filters });
    return response.data;
  },

  // Dashboard
  async getDashboard(): Promise<ComplianceDashboard> {
    const response = await api.get('/einvoice/dashboard');
    return response.data;
  },

  // TIN Validation
  async validateTin(tin: string, idType?: string, idValue?: string): Promise<TinValidationResult> {
    const response = await api.post('/einvoice/validate-tin', { tin, idType, idValue });
    return response.data;
  },
};
