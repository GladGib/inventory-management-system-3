import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  quotesService,
  Quote,
  QuoteQueryParams,
  PaginatedResponse,
  CreateQuoteDto,
  UpdateQuoteDto,
} from '@/lib/quotes';

// Query keys
export const quoteKeys = {
  all: ['quotes'] as const,
  lists: () => [...quoteKeys.all, 'list'] as const,
  list: (params: QuoteQueryParams) => [...quoteKeys.lists(), params] as const,
  details: () => [...quoteKeys.all, 'detail'] as const,
  detail: (id: string) => [...quoteKeys.details(), id] as const,
};

// ============ Queries ============

export function useQuotes(params?: QuoteQueryParams) {
  return useQuery<PaginatedResponse<Quote>>({
    queryKey: quoteKeys.list(params || {}),
    queryFn: () => quotesService.getQuotes(params),
  });
}

export function useQuote(id: string) {
  return useQuery<Quote>({
    queryKey: quoteKeys.detail(id),
    queryFn: () => quotesService.getQuote(id),
    enabled: !!id,
  });
}

// ============ Mutations ============

export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateQuoteDto) => quotesService.createQuote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      message.success('Quote created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create quote');
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuoteDto }) =>
      quotesService.updateQuote(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: quoteKeys.detail(id) });
      message.success('Quote updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update quote');
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => quotesService.deleteQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      message.success('Quote deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to delete quote');
    },
  });
}

export function useSendQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => quotesService.sendQuote(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: quoteKeys.detail(id) });
      const previousData = queryClient.getQueryData<Quote>(quoteKeys.detail(id));
      if (previousData) {
        queryClient.setQueryData<Quote>(quoteKeys.detail(id), {
          ...previousData,
          status: 'SENT',
        });
      }
      message.success('Quote marked as sent');
      return { previousData };
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }, id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(quoteKeys.detail(id), context.previousData);
      }
      message.error(error.response?.data?.message || 'Failed to send quote');
    },
    onSettled: (_, __, id) => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: quoteKeys.detail(id) });
    },
  });
}

export function useConvertToOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => quotesService.convertToOrder(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: quoteKeys.detail(id) });
      message.success('Quote converted to sales order');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to convert quote');
    },
  });
}
