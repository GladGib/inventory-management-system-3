import { api } from './api';

// ============ Types ============

export type SearchType = 'items' | 'contacts' | 'all';

export interface SearchItemResult {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category?: string;
  brand?: string;
  partNumber?: string;
  type: string;
  status: string;
  sellingPrice?: number;
  organizationId: string;
  score?: number | null;
}

export interface SearchContactResult {
  id: string;
  companyName: string;
  displayName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  type: string;
  status: string;
  organizationId: string;
  score?: number | null;
}

export interface SearchResults {
  query: string;
  type: SearchType;
  page: number;
  limit: number;
  results: {
    items?: {
      data: SearchItemResult[];
      total: number;
    };
    contacts?: {
      data: SearchContactResult[];
      total: number;
    };
  };
  engine: 'elasticsearch' | 'database';
}

export interface SuggestResults {
  query: string;
  type: SearchType;
  suggestions: {
    items?: string[];
    contacts?: string[];
  };
  engine: 'elasticsearch' | 'database';
}

export interface ReindexResult {
  message: string;
  indexed: {
    items: number;
    contacts: number;
  };
}

// ============ Service ============

export const searchService = {
  async search(params: {
    q: string;
    type?: SearchType;
    page?: number;
    limit?: number;
  }): Promise<SearchResults> {
    const response = await api.get<SearchResults>('/search', { params });
    return response.data;
  },

  async suggest(params: {
    q: string;
    type?: SearchType;
    limit?: number;
  }): Promise<SuggestResults> {
    const response = await api.get<SuggestResults>('/search/suggest', { params });
    return response.data;
  },

  async reindex(): Promise<ReindexResult> {
    const response = await api.post<ReindexResult>('/search/reindex');
    return response.data;
  },
};
