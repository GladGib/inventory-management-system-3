import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  contactsService,
  Contact,
  ContactQueryParams,
  ContactsResponse,
  CreateContactDto,
  UpdateContactDto,
} from '@/lib/contacts';

// Query keys
export const contactKeys = {
  all: ['contacts'] as const,
  lists: () => [...contactKeys.all, 'list'] as const,
  list: (params: ContactQueryParams) => [...contactKeys.lists(), params] as const,
  customers: () => [...contactKeys.all, 'customers'] as const,
  customerList: (params: Omit<ContactQueryParams, 'type'>) => [...contactKeys.customers(), params] as const,
  vendors: () => [...contactKeys.all, 'vendors'] as const,
  vendorList: (params: Omit<ContactQueryParams, 'type'>) => [...contactKeys.vendors(), params] as const,
  details: () => [...contactKeys.all, 'detail'] as const,
  detail: (id: string) => [...contactKeys.details(), id] as const,
};

// ============ Queries ============

export function useContacts(params?: ContactQueryParams) {
  return useQuery<ContactsResponse>({
    queryKey: contactKeys.list(params || {}),
    queryFn: () => contactsService.getContacts(params),
  });
}

export function useCustomers(params?: Omit<ContactQueryParams, 'type'>) {
  return useQuery<ContactsResponse>({
    queryKey: contactKeys.customerList(params || {}),
    queryFn: () => contactsService.getCustomers(params),
  });
}

export function useVendors(params?: Omit<ContactQueryParams, 'type'>) {
  return useQuery<ContactsResponse>({
    queryKey: contactKeys.vendorList(params || {}),
    queryFn: () => contactsService.getVendors(params),
  });
}

export function useContact(id: string) {
  return useQuery<Contact>({
    queryKey: contactKeys.detail(id),
    queryFn: () => contactsService.getContact(id),
    enabled: !!id,
  });
}

// ============ Mutations ============

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContactDto) => contactsService.createContact(data),
    onSuccess: (contact) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      if (contact.type === 'CUSTOMER' || contact.type === 'BOTH') {
        queryClient.invalidateQueries({ queryKey: contactKeys.customers() });
      }
      if (contact.type === 'VENDOR' || contact.type === 'BOTH') {
        queryClient.invalidateQueries({ queryKey: contactKeys.vendors() });
      }
      message.success('Contact created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create contact');
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContactDto }) =>
      contactsService.updateContact(id, data),
    onSuccess: (contact, { id }) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contactKeys.customers() });
      queryClient.invalidateQueries({ queryKey: contactKeys.vendors() });
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(id) });
      message.success('Contact updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update contact');
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contactsService.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contactKeys.customers() });
      queryClient.invalidateQueries({ queryKey: contactKeys.vendors() });
      message.success('Contact deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to delete contact');
    },
  });
}
