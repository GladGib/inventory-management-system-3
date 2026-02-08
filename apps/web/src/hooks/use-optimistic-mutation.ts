import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { message } from 'antd';

interface OptimisticMutationOptions<TData, TError, TVariables, TContext> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey: QueryKey;
  successMessage?: string;
  errorMessage?: string;
  // Function to optimistically update the cache
  updater?: (old: unknown, variables: TVariables) => unknown;
}

export function useOptimisticMutation<TData = unknown, TError = Error, TVariables = void>({
  mutationFn,
  queryKey,
  successMessage,
  errorMessage = 'Operation failed',
  updater,
}: OptimisticMutationOptions<TData, TError, TVariables, { previousData: unknown }>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey);
      // Optimistically update
      if (updater && previousData !== undefined) {
        queryClient.setQueryData(queryKey, (old: unknown) => updater(old, variables));
      }
      if (successMessage) {
        message.success(successMessage);
      }
      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      message.error(errorMessage);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
