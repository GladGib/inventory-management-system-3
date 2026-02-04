import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { addressesService, Address, CreateAddressDto, UpdateAddressDto } from '@/lib/addresses';

// Query keys
export const addressKeys = {
  all: ['addresses'] as const,
  list: (contactId: string) => [...addressKeys.all, 'list', contactId] as const,
  detail: (contactId: string, addressId: string) =>
    [...addressKeys.all, 'detail', contactId, addressId] as const,
};

// ============ Queries ============

export function useContactAddresses(contactId: string) {
  return useQuery<Address[]>({
    queryKey: addressKeys.list(contactId),
    queryFn: () => addressesService.getAddresses(contactId),
    enabled: !!contactId,
  });
}

export function useAddress(contactId: string, addressId: string) {
  return useQuery<Address>({
    queryKey: addressKeys.detail(contactId, addressId),
    queryFn: () => addressesService.getAddress(contactId, addressId),
    enabled: !!contactId && !!addressId,
  });
}

// ============ Mutations ============

export function useCreateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId, data }: { contactId: string; data: CreateAddressDto }) =>
      addressesService.createAddress(contactId, data),
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: addressKeys.list(contactId) });
      message.success('Address added successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to add address');
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contactId,
      addressId,
      data,
    }: {
      contactId: string;
      addressId: string;
      data: UpdateAddressDto;
    }) => addressesService.updateAddress(contactId, addressId, data),
    onSuccess: (_, { contactId, addressId }) => {
      queryClient.invalidateQueries({ queryKey: addressKeys.list(contactId) });
      queryClient.invalidateQueries({
        queryKey: addressKeys.detail(contactId, addressId),
      });
      message.success('Address updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update address');
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId, addressId }: { contactId: string; addressId: string }) =>
      addressesService.deleteAddress(contactId, addressId),
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: addressKeys.list(contactId) });
      message.success('Address deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to delete address');
    },
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId, addressId }: { contactId: string; addressId: string }) =>
      addressesService.setDefaultAddress(contactId, addressId),
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: addressKeys.list(contactId) });
      message.success('Default address updated');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to set default address');
    },
  });
}
