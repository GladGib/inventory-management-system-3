import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  accountingService,
  ChartOfAccount,
  JournalEntry,
  AccountMapping,
  TrialBalanceReport,
  JournalEntryQueryParams,
  PaginatedResponse,
  CreateAccountDto,
  UpdateAccountDto,
  CreateJournalEntryDto,
  GenerateJournalEntryDto,
  UpdateAccountMappingsDto,
} from '@/lib/accounting';

// Query keys
export const accountingKeys = {
  all: ['accounting'] as const,
  accounts: () => [...accountingKeys.all, 'accounts'] as const,
  accountList: () => [...accountingKeys.accounts(), 'list'] as const,
  journalEntries: () => [...accountingKeys.all, 'journal-entries'] as const,
  journalEntryList: (params: JournalEntryQueryParams) =>
    [...accountingKeys.journalEntries(), 'list', params] as const,
  journalEntryDetail: (id: string) =>
    [...accountingKeys.journalEntries(), 'detail', id] as const,
  accountMappings: () => [...accountingKeys.all, 'account-mappings'] as const,
  trialBalance: (asOfDate?: string) =>
    [...accountingKeys.all, 'trial-balance', asOfDate] as const,
};

// ============ Chart of Accounts ============

export function useChartOfAccounts() {
  return useQuery<ChartOfAccount[]>({
    queryKey: accountingKeys.accountList(),
    queryFn: () => accountingService.getChartOfAccounts(),
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAccountDto) => accountingService.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingKeys.accounts() });
      message.success('Account created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create account');
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAccountDto }) =>
      accountingService.updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingKeys.accounts() });
      message.success('Account updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update account');
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => accountingService.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingKeys.accounts() });
      message.success('Account deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to delete account');
    },
  });
}

export function useSeedDefaultAccounts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => accountingService.seedDefaultAccounts(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: accountingKeys.accounts() });
      message.success(result.message);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to seed default accounts');
    },
  });
}

// ============ Journal Entries ============

export function useJournalEntries(params?: JournalEntryQueryParams) {
  return useQuery<PaginatedResponse<JournalEntry>>({
    queryKey: accountingKeys.journalEntryList(params || {}),
    queryFn: () => accountingService.getJournalEntries(params),
  });
}

export function useJournalEntry(id: string) {
  return useQuery<JournalEntry>({
    queryKey: accountingKeys.journalEntryDetail(id),
    queryFn: () => accountingService.getJournalEntry(id),
    enabled: !!id,
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJournalEntryDto) => accountingService.createJournalEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingKeys.journalEntries() });
      message.success('Journal entry created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create journal entry');
    },
  });
}

export function useGenerateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateJournalEntryDto) =>
      accountingService.generateJournalEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingKeys.journalEntries() });
      message.success('Journal entry generated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(
        error.response?.data?.message || 'Failed to generate journal entry',
      );
    },
  });
}

// ============ Account Mappings ============

export function useAccountMappings() {
  return useQuery<AccountMapping[]>({
    queryKey: accountingKeys.accountMappings(),
    queryFn: () => accountingService.getAccountMappings(),
  });
}

export function useUpdateAccountMappings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAccountMappingsDto) =>
      accountingService.updateAccountMappings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingKeys.accountMappings() });
      message.success('Account mappings updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(
        error.response?.data?.message || 'Failed to update account mappings',
      );
    },
  });
}

// ============ Trial Balance ============

export function useTrialBalance(asOfDate?: string) {
  return useQuery<TrialBalanceReport>({
    queryKey: accountingKeys.trialBalance(asOfDate),
    queryFn: () => accountingService.getTrialBalance(asOfDate),
  });
}

// ============ Export ============

export function useExportJournalEntries() {
  return useMutation({
    mutationFn: ({
      format,
      dateFrom,
      dateTo,
    }: {
      format: 'csv' | 'excel';
      dateFrom?: string;
      dateTo?: string;
    }) => accountingService.exportJournalEntries(format, dateFrom, dateTo),
    onSuccess: (blob, { format }) => {
      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `journal-entries-${dateStr}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success('Export downloaded successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to export journal entries');
    },
  });
}
