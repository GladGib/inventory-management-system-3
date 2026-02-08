import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  bankingService,
  BankAccount,
  BankTransaction,
  ReconciliationSummary,
  TransactionQueryParams,
  PaginatedResponse,
  CreateBankAccountDto,
  UpdateBankAccountDto,
  CreateTransactionDto,
  ReconcileTransactionsDto,
  ImportStatementDto,
  ImportResult,
} from '@/lib/banking';

// Query keys
export const bankingKeys = {
  all: ['banking'] as const,
  accounts: () => [...bankingKeys.all, 'accounts'] as const,
  accountList: () => [...bankingKeys.accounts(), 'list'] as const,
  accountDetail: (id: string) => [...bankingKeys.accounts(), 'detail', id] as const,
  transactions: (accountId: string) =>
    [...bankingKeys.all, 'transactions', accountId] as const,
  transactionList: (accountId: string, params: TransactionQueryParams) =>
    [...bankingKeys.transactions(accountId), 'list', params] as const,
  reconciliation: (accountId: string) =>
    [...bankingKeys.all, 'reconciliation', accountId] as const,
};

// ============ Bank Accounts ============

export function useBankAccounts() {
  return useQuery<BankAccount[]>({
    queryKey: bankingKeys.accountList(),
    queryFn: () => bankingService.getBankAccounts(),
  });
}

export function useBankAccount(id: string) {
  return useQuery<BankAccount>({
    queryKey: bankingKeys.accountDetail(id),
    queryFn: () => bankingService.getBankAccount(id),
    enabled: !!id,
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBankAccountDto) => bankingService.createBankAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.accounts() });
      message.success('Bank account created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create bank account');
    },
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBankAccountDto }) =>
      bankingService.updateBankAccount(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: bankingKeys.accountDetail(id) });
      message.success('Bank account updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update bank account');
    },
  });
}

// ============ Transactions ============

export function useBankTransactions(accountId: string, params?: TransactionQueryParams) {
  return useQuery<PaginatedResponse<BankTransaction>>({
    queryKey: bankingKeys.transactionList(accountId, params || {}),
    queryFn: () => bankingService.getTransactions(accountId, params),
    enabled: !!accountId,
  });
}

export function useRecordTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountId, data }: { accountId: string; data: CreateTransactionDto }) =>
      bankingService.recordTransaction(accountId, data),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.transactions(accountId) });
      queryClient.invalidateQueries({ queryKey: bankingKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: bankingKeys.reconciliation(accountId) });
      message.success('Transaction recorded successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to record transaction');
    },
  });
}

// ============ Reconciliation ============

export function useReconciliationSummary(accountId: string) {
  return useQuery<ReconciliationSummary>({
    queryKey: bankingKeys.reconciliation(accountId),
    queryFn: () => bankingService.getReconciliationSummary(accountId),
    enabled: !!accountId,
  });
}

export function useReconcileTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReconcileTransactionsDto) =>
      bankingService.reconcileTransactions(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.all });
      message.success('Transactions reconciled successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to reconcile transactions');
    },
  });
}

// ============ Import ============

export function useImportBankStatement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountId, data }: { accountId: string; data: ImportStatementDto }) =>
      bankingService.importBankStatement(accountId, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.all });
      message.success(result.message);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to import bank statement');
    },
  });
}
