import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  searchService,
  SearchResults,
  SuggestResults,
  SearchType,
} from '@/lib/search';

// Query keys
export const searchKeys = {
  all: ['search'] as const,
  search: (q: string, type?: SearchType, page?: number, limit?: number) =>
    [...searchKeys.all, 'results', q, type, page, limit] as const,
  suggest: (q: string, type?: SearchType) =>
    [...searchKeys.all, 'suggest', q, type] as const,
};

/**
 * Hook for full-text search across items and contacts
 */
export function useGlobalSearch(
  q: string,
  options?: {
    type?: SearchType;
    page?: number;
    limit?: number;
    enabled?: boolean;
  },
) {
  const { type = 'all', page = 1, limit = 20, enabled = true } = options || {};

  return useQuery<SearchResults>({
    queryKey: searchKeys.search(q, type, page, limit),
    queryFn: () => searchService.search({ q, type, page, limit }),
    enabled: enabled && !!q && q.trim().length >= 2,
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for autocomplete suggestions
 */
export function useSearchSuggest(
  q: string,
  options?: {
    type?: SearchType;
    limit?: number;
    enabled?: boolean;
  },
) {
  const { type = 'all', limit = 7, enabled = true } = options || {};

  return useQuery<SuggestResults>({
    queryKey: searchKeys.suggest(q, type),
    queryFn: () => searchService.suggest({ q, type, limit }),
    enabled: enabled && !!q && q.trim().length >= 1,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to trigger re-indexing of all searchable data
 */
export function useReindex() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => searchService.reindex(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: searchKeys.all });
      message.success(
        `Re-indexing complete: ${data.indexed.items} items, ${data.indexed.contacts} contacts`,
      );
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(
        error.response?.data?.message || 'Failed to re-index search data',
      );
    },
  });
}
