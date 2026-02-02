import { api } from './api';

// Types
export type ContactType = 'CUSTOMER' | 'VENDOR' | 'BOTH';
export type ContactStatus = 'ACTIVE' | 'INACTIVE';

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export interface Contact {
  id: string;
  organizationId: string;
  type: ContactType;
  companyName: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  taxNumber?: string;
  creditLimit?: number;
  paymentTermId?: string;
  priceListId?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  notes?: string;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
  paymentTerm?: {
    id: string;
    name: string;
    days: number;
  };
  outstandingBalance: number;
}

export interface ContactQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: ContactType;
  status?: ContactStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ContactsResponse {
  data: Contact[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface CreateContactDto {
  type: ContactType;
  companyName: string;
  displayName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  taxNumber?: string;
  creditLimit?: number;
  paymentTermId?: string;
  priceListId?: string;
  leadTimeDays?: number;
  minimumOrderAmount?: number;
  notes?: string;
}

export interface UpdateContactDto extends Partial<CreateContactDto> {}

// Service
export const contactsService = {
  async getContacts(params?: ContactQueryParams): Promise<ContactsResponse> {
    const response = await api.get('/contacts', { params });
    return response.data;
  },

  async getCustomers(params?: Omit<ContactQueryParams, 'type'>): Promise<ContactsResponse> {
    const response = await api.get('/customers', { params });
    return response.data;
  },

  async getVendors(params?: Omit<ContactQueryParams, 'type'>): Promise<ContactsResponse> {
    const response = await api.get('/vendors', { params });
    return response.data;
  },

  async getContact(id: string): Promise<Contact> {
    const response = await api.get(`/contacts/${id}`);
    return response.data;
  },

  async getContactBalance(id: string): Promise<{
    totalReceivable: number;
    totalReceived: number;
    receivableBalance: number;
    totalPayable: number;
    totalPaid: number;
    payableBalance: number;
    outstandingBalance: number;
  }> {
    const response = await api.get(`/contacts/${id}/balance`);
    return response.data;
  },

  async createContact(data: CreateContactDto): Promise<Contact> {
    const response = await api.post('/contacts', data);
    return response.data;
  },

  async updateContact(id: string, data: UpdateContactDto): Promise<Contact> {
    const response = await api.put(`/contacts/${id}`, data);
    return response.data;
  },

  async deleteContact(id: string): Promise<void> {
    await api.delete(`/contacts/${id}`);
  },
};
