import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  onlinePaymentService,
  BankInfo,
  InitiatePaymentDto,
  InitiatePaymentResult,
  OnlinePaymentStatusResult,
} from '@/lib/online-payments';

// Query keys
export const onlinePaymentKeys = {
  all: ['onlinePayments'] as const,
  banks: (gateway: string) =>
    [...onlinePaymentKeys.all, 'banks', gateway] as const,
  status: (paymentId: string) =>
    [...onlinePaymentKeys.all, 'status', paymentId] as const,
};

/**
 * Fetches the list of available banks for a given payment gateway.
 */
export function useBankList(gateway: string) {
  return useQuery<BankInfo[]>({
    queryKey: onlinePaymentKeys.banks(gateway),
    queryFn: () => onlinePaymentService.getBanks(gateway),
    enabled: !!gateway,
    staleTime: 5 * 60 * 1000, // Banks list is fairly static, cache 5 min
  });
}

/**
 * Initiates an online payment and returns the redirect URL.
 */
export function useInitiatePayment() {
  const queryClient = useQueryClient();

  return useMutation<InitiatePaymentResult, Error & { response?: { data?: { message?: string } } }, InitiatePaymentDto>({
    mutationFn: (data: InitiatePaymentDto) =>
      onlinePaymentService.initiatePayment(data),
    onSuccess: () => {
      message.success('Payment initiated - redirecting to bank...');
    },
    onError: (error) => {
      message.error(
        error.response?.data?.message || 'Failed to initiate payment',
      );
    },
  });
}

/**
 * Polls the status of an online payment.
 */
export function useOnlinePaymentStatus(
  paymentId: string,
  options?: { enabled?: boolean; refetchInterval?: number },
) {
  return useQuery<OnlinePaymentStatusResult>({
    queryKey: onlinePaymentKeys.status(paymentId),
    queryFn: () => onlinePaymentService.checkStatus(paymentId),
    enabled: !!paymentId && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval,
  });
}
