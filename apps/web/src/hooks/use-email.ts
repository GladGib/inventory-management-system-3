import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailService, EmailSettings, EmailLogsResponse } from '@/lib/email';

// Query keys
export const emailKeys = {
  all: ['email'] as const,
  settings: () => [...emailKeys.all, 'settings'] as const,
  logs: (params?: { page?: number; limit?: number; type?: string; status?: string }) =>
    [...emailKeys.all, 'logs', params] as const,
};

// ============ Settings Queries ============

export function useEmailSettings() {
  return useQuery<EmailSettings>({
    queryKey: emailKeys.settings(),
    queryFn: () => emailService.getSettings(),
  });
}

export function useUpdateEmailSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: EmailSettings) => emailService.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.settings() });
    },
  });
}

export function useTestEmailConnection() {
  return useMutation({
    mutationFn: () => emailService.testConnection(),
  });
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: (email: string) => emailService.sendTestEmail(email),
  });
}

// ============ Email Logs Queries ============

export function useEmailLogs(params?: {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
}) {
  return useQuery<EmailLogsResponse>({
    queryKey: emailKeys.logs(params),
    queryFn: () => emailService.getEmailLogs(params),
  });
}

// ============ Send Email Mutations ============

export function useSendInvoiceEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoiceId: string) => emailService.sendInvoiceEmail(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.logs() });
    },
  });
}

export function useSendPaymentReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentId: string) => emailService.sendPaymentReceipt(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.logs() });
    },
  });
}

export function useSendOrderConfirmation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => emailService.sendOrderConfirmation(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.logs() });
    },
  });
}

export function useSendPOToVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (poId: string) => emailService.sendPOToVendor(poId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.logs() });
    },
  });
}
