import { useQuery, useMutation } from '@tanstack/react-query';
import {
  paymentsService,
  InitiatePaymentPayload,
  InitiatePaymentResponse,
  PaymentStatusResponse,
  BankInfo,
} from '@/lib/payments';

// Query keys
export const paymentKeys = {
  all: ['payments'] as const,
  status: (paymentId: string) =>
    [...paymentKeys.all, 'status', paymentId] as const,
  banks: (gateway: string) =>
    [...paymentKeys.all, 'banks', gateway] as const,
};

// ============ Queries ============

/**
 * Hook to check payment status.
 * Can be used for manual checks; for polling, use the PaymentStatus component.
 */
export function usePaymentStatus(paymentId: string, enabled = true) {
  return useQuery<PaymentStatusResponse>({
    queryKey: paymentKeys.status(paymentId),
    queryFn: () => paymentsService.checkPaymentStatus(paymentId),
    enabled: !!paymentId && enabled,
    refetchInterval: false, // Polling is handled by PaymentStatus component
  });
}

/**
 * Hook to get available banks for a payment gateway (e.g., FPX).
 */
export function useBankList(gateway: string, enabled = true) {
  return useQuery<BankInfo[]>({
    queryKey: paymentKeys.banks(gateway),
    queryFn: () => paymentsService.getBankList(gateway),
    enabled: !!gateway && enabled,
    staleTime: 5 * 60 * 1000, // Banks list rarely changes, cache for 5 minutes
  });
}

// ============ Mutations ============

/**
 * Hook to initiate an online payment.
 * On success, redirects the user to the payment gateway URL.
 */
export function useInitiatePayment() {
  return useMutation<InitiatePaymentResponse, Error, InitiatePaymentPayload>({
    mutationFn: (payload) => paymentsService.initiatePayment(payload),
    onSuccess: (data) => {
      // Redirect to payment gateway
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    },
  });
}
