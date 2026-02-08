import { api } from './api';

// ============ Types ============

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type JournalEntryStatus = 'DRAFT' | 'POSTED';

export interface ChartOfAccount {
  id: string;
  accountCode: string;
  name: string;
  type: AccountType;
  parentId?: string | null;
  isSystem: boolean;
  isActive: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  parent?: { id: string; accountCode: string; name: string } | null;
  children?: ChartOfAccount[];
  _count?: { journalEntryLines: number };
}

export interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  debit: number;
  credit: number;
  description?: string | null;
  account?: {
    id: string;
    accountCode: string;
    name: string;
    type: AccountType;
  };
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  sourceType?: string | null;
  sourceId?: string | null;
  status: JournalEntryStatus;
  organizationId: string;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: JournalEntryLine[];
}

export interface AccountMapping {
  id: string;
  transactionType: string;
  accountId: string;
  organizationId: string;
  account?: {
    id: string;
    accountCode: string;
    name: string;
    type: AccountType;
  };
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  totalDebit: number;
  totalCredit: number;
}

export interface TrialBalanceReport {
  asOfDate: string;
  accounts: TrialBalanceRow[];
  totals: {
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
  };
}

// ============ Query Params ============

export interface JournalEntryQueryParams {
  status?: JournalEntryStatus;
  sourceType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============ DTOs ============

export interface CreateAccountDto {
  accountCode: string;
  name: string;
  type: AccountType;
  parentId?: string;
  isSystem?: boolean;
}

export interface UpdateAccountDto {
  name?: string;
  type?: AccountType;
  parentId?: string | null;
  isActive?: boolean;
}

export interface JournalEntryLineDto {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface CreateJournalEntryDto {
  date: string;
  description: string;
  sourceType?: string;
  sourceId?: string;
  status?: JournalEntryStatus;
  lines: JournalEntryLineDto[];
}

export interface GenerateJournalEntryDto {
  sourceType: string;
  sourceId: string;
}

export interface AccountMappingItem {
  transactionType: string;
  accountId: string;
}

export interface UpdateAccountMappingsDto {
  mappings: AccountMappingItem[];
}

// ============ Service ============

export const accountingService = {
  // Chart of Accounts
  async getChartOfAccounts(tree?: boolean): Promise<ChartOfAccount[]> {
    const params = tree ? { tree: 'true' } : {};
    const response = await api.get<ChartOfAccount[]>('/accounting/chart-of-accounts', { params });
    return response.data;
  },

  async createAccount(data: CreateAccountDto): Promise<ChartOfAccount> {
    const response = await api.post<ChartOfAccount>('/accounting/chart-of-accounts', data);
    return response.data;
  },

  async updateAccount(id: string, data: UpdateAccountDto): Promise<ChartOfAccount> {
    const response = await api.put<ChartOfAccount>(`/accounting/chart-of-accounts/${id}`, data);
    return response.data;
  },

  async deleteAccount(id: string): Promise<void> {
    await api.delete(`/accounting/chart-of-accounts/${id}`);
  },

  async seedDefaultAccounts(): Promise<{ message: string; count: number }> {
    const response = await api.post<{ message: string; count: number }>(
      '/accounting/chart-of-accounts/seed',
    );
    return response.data;
  },

  // Journal Entries
  async getJournalEntries(
    params?: JournalEntryQueryParams,
  ): Promise<PaginatedResponse<JournalEntry>> {
    const response = await api.get<PaginatedResponse<JournalEntry>>(
      '/accounting/journal-entries',
      { params },
    );
    return response.data;
  },

  async getJournalEntry(id: string): Promise<JournalEntry> {
    const response = await api.get<JournalEntry>(`/accounting/journal-entries/${id}`);
    return response.data;
  },

  async createJournalEntry(data: CreateJournalEntryDto): Promise<JournalEntry> {
    const response = await api.post<JournalEntry>('/accounting/journal-entries', data);
    return response.data;
  },

  async generateJournalEntry(data: GenerateJournalEntryDto): Promise<JournalEntry> {
    const response = await api.post<JournalEntry>(
      '/accounting/journal-entries/generate',
      data,
    );
    return response.data;
  },

  // Account Mappings
  async getAccountMappings(): Promise<AccountMapping[]> {
    const response = await api.get<AccountMapping[]>('/accounting/account-mappings');
    return response.data;
  },

  async updateAccountMappings(data: UpdateAccountMappingsDto): Promise<AccountMapping[]> {
    const response = await api.put<AccountMapping[]>('/accounting/account-mappings', data);
    return response.data;
  },

  // Trial Balance
  async getTrialBalance(asOfDate?: string): Promise<TrialBalanceReport> {
    const params = asOfDate ? { asOfDate } : {};
    const response = await api.get<TrialBalanceReport>('/accounting/trial-balance', { params });
    return response.data;
  },

  // Export
  async exportJournalEntries(
    format: 'csv' | 'excel',
    dateFrom?: string,
    dateTo?: string,
  ): Promise<Blob> {
    const params: Record<string, string> = { format };
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;

    const response = await api.post('/accounting/export', null, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};
