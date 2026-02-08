import { api } from './api';

// ============ Types ============

export type BankAccountType = 'CURRENT' | 'SAVINGS';
export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'FEE' | 'INTEREST';

export interface BankAccount {
  id: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  accountType: BankAccountType;
  swiftCode?: string | null;
  isDefault: boolean;
  isActive: boolean;
  openingBalance: number;
  currentBalance: number;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { transactions: number };
}

export interface BankTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description?: string | null;
  reference?: string | null;
  reconciled: boolean;
  reconciledAt?: string | null;
  bankAccountId: string;
  paymentId?: string | null;
  vendorPaymentId?: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationSummary {
  accountId: string;
  bankName: string;
  accountNumber: string;
  currentBalance: number;
  reconciledBalance: number;
  unreconciledCount: number;
  unreconciledDeposits: number;
  unreconciledWithdrawals: number;
  unreconciledNet: number;
  unreconciledTransactions: BankTransaction[];
}

export interface TransactionQueryParams {
  dateFrom?: string;
  dateTo?: string;
  type?: TransactionType;
  reconciled?: string;
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

export interface CreateBankAccountDto {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  accountType?: BankAccountType;
  swiftCode?: string;
  openingBalance?: number;
}

export interface UpdateBankAccountDto {
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  accountType?: BankAccountType;
  swiftCode?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface CreateTransactionDto {
  type: TransactionType;
  amount: number;
  date: string;
  description?: string;
  reference?: string;
}

export interface ReconcileTransactionsDto {
  transactionIds: string[];
}

export interface ImportStatementDto {
  format: 'CSV' | 'OFX';
  content: string;
}

export interface ImportResult {
  message: string;
  importedCount: number;
  balanceChange: number;
  newBalance: number;
}

// ============ Malaysian Bank Codes ============

export const MALAYSIAN_BANKS = [
  { code: 'MBBEMYKL', name: 'Maybank', shortName: 'MBB' },
  { code: 'CIBBMYKL', name: 'CIMB Bank', shortName: 'CIMB' },
  { code: 'PABOREMYKL', name: 'Public Bank', shortName: 'PBB' },
  { code: 'RHBBMYKL', name: 'RHB Bank', shortName: 'RHB' },
  { code: 'HLBBMYKL', name: 'Hong Leong Bank', shortName: 'HLB' },
  { code: 'AMMBMYKL', name: 'AmBank', shortName: 'AMB' },
  { code: 'UOVBMYKL', name: 'United Overseas Bank (UOB)', shortName: 'UOB' },
  { code: 'BKRMMYKL', name: 'Bank Rakyat', shortName: 'BKRM' },
  { code: 'BIMBMYKL', name: 'Bank Islam Malaysia', shortName: 'BIMB' },
  { code: 'BMMBMYKL', name: 'Bank Muamalat', shortName: 'BMM' },
  { code: 'AFBQMYKL', name: 'Affin Bank', shortName: 'AFFIN' },
  { code: 'ARBKMYKL', name: 'Alliance Bank', shortName: 'ALLIANCE' },
  { code: 'BSNAMYK1', name: 'BSN (Bank Simpanan Nasional)', shortName: 'BSN' },
  { code: 'AIABOREMYKL', name: 'Agrobank', shortName: 'AGRO' },
  { code: 'OCBCMYKL', name: 'OCBC Bank', shortName: 'OCBC' },
  { code: 'HABOREMYKL', name: 'HSBC Bank Malaysia', shortName: 'HSBC' },
  { code: 'SCBLMYKX', name: 'Standard Chartered Bank', shortName: 'SCB' },
];

// ============ Service ============

export const bankingService = {
  // Bank Accounts
  async createBankAccount(data: CreateBankAccountDto): Promise<BankAccount> {
    const response = await api.post<BankAccount>('/banking/accounts', data);
    return response.data;
  },

  async getBankAccounts(): Promise<BankAccount[]> {
    const response = await api.get<BankAccount[]>('/banking/accounts');
    return response.data;
  },

  async getBankAccount(id: string): Promise<BankAccount> {
    const response = await api.get<BankAccount>(`/banking/accounts/${id}`);
    return response.data;
  },

  async updateBankAccount(id: string, data: UpdateBankAccountDto): Promise<BankAccount> {
    const response = await api.patch<BankAccount>(`/banking/accounts/${id}`, data);
    return response.data;
  },

  // Transactions
  async recordTransaction(accountId: string, data: CreateTransactionDto): Promise<BankTransaction> {
    const response = await api.post<BankTransaction>(
      `/banking/accounts/${accountId}/transactions`,
      data,
    );
    return response.data;
  },

  async getTransactions(
    accountId: string,
    params?: TransactionQueryParams,
  ): Promise<PaginatedResponse<BankTransaction>> {
    const response = await api.get<PaginatedResponse<BankTransaction>>(
      `/banking/accounts/${accountId}/transactions`,
      { params },
    );
    return response.data;
  },

  // Reconciliation
  async reconcileTransactions(data: ReconcileTransactionsDto): Promise<{ message: string; reconciledCount: number }> {
    const response = await api.patch<{ message: string; reconciledCount: number }>(
      '/banking/transactions/reconcile',
      data,
    );
    return response.data;
  },

  async getReconciliationSummary(accountId: string): Promise<ReconciliationSummary> {
    const response = await api.get<ReconciliationSummary>(
      `/banking/accounts/${accountId}/reconciliation`,
    );
    return response.data;
  },

  // Import
  async importBankStatement(accountId: string, data: ImportStatementDto): Promise<ImportResult> {
    const response = await api.post<ImportResult>(
      `/banking/accounts/${accountId}/import`,
      data,
    );
    return response.data;
  },
};
