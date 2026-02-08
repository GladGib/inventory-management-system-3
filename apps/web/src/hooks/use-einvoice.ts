import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  einvoiceService,
  EInvoiceSettings,
  UpdateEInvoiceSettingsPayload,
  ConnectionTestResult,
  EInvoiceSubmissionResult,
  SubmissionsResponse,
  ComplianceDashboard,
  SubmissionFilters,
  TinValidationResult,
} from '@/lib/einvoice';

// Query keys
export const einvoiceKeys = {
  all: ['einvoice'] as const,
  settings: () => [...einvoiceKeys.all, 'settings'] as const,
  dashboard: () => [...einvoiceKeys.all, 'dashboard'] as const,
  submissions: (filters?: SubmissionFilters) =>
    [...einvoiceKeys.all, 'submissions', filters] as const,
  status: (invoiceId: string) => [...einvoiceKeys.all, 'status', invoiceId] as const,
  qrcode: (invoiceId: string) => [...einvoiceKeys.all, 'qrcode', invoiceId] as const,
};

// ============ Settings Queries ============

export function useEInvoiceSettings() {
  return useQuery<EInvoiceSettings>({
    queryKey: einvoiceKeys.settings(),
    queryFn: () => einvoiceService.getSettings(),
  });
}

export function useUpdateEInvoiceSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateEInvoiceSettingsPayload) => einvoiceService.updateSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: einvoiceKeys.settings() });
    },
  });
}

// ============ Connection Test ============

export function useTestEInvoiceConnection() {
  return useMutation<ConnectionTestResult>({
    mutationFn: () => einvoiceService.testConnection(),
  });
}

// ============ Submission Mutations ============

export function useSubmitEInvoice() {
  const queryClient = useQueryClient();

  return useMutation<EInvoiceSubmissionResult, Error, string>({
    mutationFn: (invoiceId: string) => einvoiceService.submitInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: einvoiceKeys.submissions() });
      queryClient.invalidateQueries({ queryKey: einvoiceKeys.dashboard() });
    },
  });
}

export function useSubmitBatchEInvoice() {
  const queryClient = useQueryClient();

  return useMutation<EInvoiceSubmissionResult[], Error, string[]>({
    mutationFn: (invoiceIds: string[]) => einvoiceService.submitBatch(invoiceIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: einvoiceKeys.submissions() });
      queryClient.invalidateQueries({ queryKey: einvoiceKeys.dashboard() });
    },
  });
}

// ============ Cancel Mutation ============

export function useCancelEInvoice() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; message: string },
    Error,
    { invoiceId: string; reason: string }
  >({
    mutationFn: ({ invoiceId, reason }) => einvoiceService.cancelInvoice(invoiceId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: einvoiceKeys.submissions() });
      queryClient.invalidateQueries({ queryKey: einvoiceKeys.dashboard() });
    },
  });
}

// ============ Status Query ============

export function useEInvoiceStatus(invoiceId: string) {
  return useQuery({
    queryKey: einvoiceKeys.status(invoiceId),
    queryFn: () => einvoiceService.getStatus(invoiceId),
    enabled: !!invoiceId,
  });
}

// ============ QR Code Query ============

export function useEInvoiceQRCode(invoiceId: string) {
  return useQuery<{ qrCode: string }>({
    queryKey: einvoiceKeys.qrcode(invoiceId),
    queryFn: () => einvoiceService.getQRCode(invoiceId),
    enabled: !!invoiceId,
  });
}

// ============ Submissions List ============

export function useEInvoiceSubmissions(filters?: SubmissionFilters) {
  return useQuery<SubmissionsResponse>({
    queryKey: einvoiceKeys.submissions(filters),
    queryFn: () => einvoiceService.getSubmissions(filters),
  });
}

// ============ Dashboard ============

export function useEInvoiceDashboard() {
  return useQuery<ComplianceDashboard>({
    queryKey: einvoiceKeys.dashboard(),
    queryFn: () => einvoiceService.getDashboard(),
  });
}

// ============ TIN Validation ============

export function useValidateTin() {
  return useMutation<
    TinValidationResult,
    Error,
    { tin: string; idType?: string; idValue?: string }
  >({
    mutationFn: ({ tin, idType, idValue }) => einvoiceService.validateTin(tin, idType, idValue),
  });
}
