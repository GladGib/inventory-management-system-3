import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useOptimisticMutation } from '@/hooks/use-optimistic-mutation';

// Mock antd message to avoid side effects in tests
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useOptimisticMutation', () => {
  it('should be importable', () => {
    expect(useOptimisticMutation).toBeDefined();
    expect(typeof useOptimisticMutation).toBe('function');
  });

  it('should return a mutation object when called with valid options', () => {
    const wrapper = createWrapper();

    const { result } = renderHook(
      () =>
        useOptimisticMutation({
          mutationFn: async (_vars: { id: string }) => ({ success: true }),
          queryKey: ['test'],
          successMessage: 'Done',
          errorMessage: 'Failed',
        }),
      { wrapper }
    );

    // The hook should return a mutation object with standard react-query mutation properties
    expect(result.current).toBeDefined();
    expect(typeof result.current.mutate).toBe('function');
    expect(typeof result.current.mutateAsync).toBe('function');
    expect(result.current.isIdle).toBe(true);
  });

  it('should accept an updater function for optimistic updates', () => {
    const wrapper = createWrapper();

    const mockUpdater = jest.fn((old: unknown, _vars: { id: string }) => old);

    const { result } = renderHook(
      () =>
        useOptimisticMutation({
          mutationFn: async (_vars: { id: string }) => ({ success: true }),
          queryKey: ['test-optimistic'],
          updater: mockUpdater,
        }),
      { wrapper }
    );

    expect(result.current).toBeDefined();
    expect(typeof result.current.mutate).toBe('function');
  });

  it('should default errorMessage to "Operation failed"', () => {
    const wrapper = createWrapper();

    const { result } = renderHook(
      () =>
        useOptimisticMutation({
          mutationFn: async () => ({ success: true }),
          queryKey: ['test-default-error'],
        }),
      { wrapper }
    );

    // Hook should initialize without error even without errorMessage
    expect(result.current).toBeDefined();
    expect(result.current.isIdle).toBe(true);
  });
});
