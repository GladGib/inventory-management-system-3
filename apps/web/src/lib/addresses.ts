import { api } from './api';

// Types
export interface Address {
  id: string;
  contactId: string;
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  isDefault: boolean;
  isBilling: boolean;
  isShipping: boolean;
  phone?: string;
  attention?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressDto {
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postcode: string;
  country?: string;
  isDefault?: boolean;
  isBilling?: boolean;
  isShipping?: boolean;
  phone?: string;
  attention?: string;
}

export interface UpdateAddressDto extends Partial<CreateAddressDto> {}

// Malaysian states constant
export const MALAYSIAN_STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Kuala Lumpur',
  'Labuan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Penang',
  'Perak',
  'Perlis',
  'Putrajaya',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
] as const;

// Service
export const addressesService = {
  async getAddresses(contactId: string): Promise<Address[]> {
    const response = await api.get<Address[]>(`/contacts/${contactId}/addresses`);
    return response.data;
  },

  async getAddress(contactId: string, addressId: string): Promise<Address> {
    const response = await api.get<Address>(`/contacts/${contactId}/addresses/${addressId}`);
    return response.data;
  },

  async createAddress(contactId: string, data: CreateAddressDto): Promise<Address> {
    const response = await api.post<Address>(`/contacts/${contactId}/addresses`, data);
    return response.data;
  },

  async updateAddress(
    contactId: string,
    addressId: string,
    data: UpdateAddressDto
  ): Promise<Address> {
    const response = await api.put<Address>(`/contacts/${contactId}/addresses/${addressId}`, data);
    return response.data;
  },

  async deleteAddress(contactId: string, addressId: string): Promise<void> {
    await api.delete(`/contacts/${contactId}/addresses/${addressId}`);
  },

  async setDefaultAddress(contactId: string, addressId: string): Promise<Address> {
    const response = await api.put<Address>(
      `/contacts/${contactId}/addresses/${addressId}/default`
    );
    return response.data;
  },
};
