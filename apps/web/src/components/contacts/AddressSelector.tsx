'use client';

import { Select, Button, Space, Typography, Divider, Spin, Empty } from 'antd';
import { PlusOutlined, EnvironmentOutlined, StarFilled } from '@ant-design/icons';
import { useContactAddresses } from '@/hooks/use-addresses';
import type { Address } from '@/lib/addresses';

const { Text, Paragraph } = Typography;

interface AddressSelectorProps {
  contactId: string;
  type?: 'billing' | 'shipping' | 'all';
  value?: string;
  onChange: (addressId: string | undefined, address?: Address) => void;
  allowCustom?: boolean;
  onAddNew?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function AddressSelector({
  contactId,
  type = 'all',
  value,
  onChange,
  allowCustom = false,
  onAddNew,
  disabled = false,
  placeholder,
}: AddressSelectorProps) {
  const { data: addresses = [], isLoading } = useContactAddresses(contactId);

  // Filter addresses based on type
  const filteredAddresses = addresses.filter((addr) => {
    if (type === 'billing') return addr.isBilling;
    if (type === 'shipping') return addr.isShipping;
    return true;
  });

  const selectedAddress = filteredAddresses.find((addr) => addr.id === value);

  const formatAddressDisplay = (address: Address) => {
    const parts = [address.addressLine1, address.city, address.state];
    return parts.join(', ');
  };

  const handleChange = (selectedId: string | undefined) => {
    const address = selectedId
      ? filteredAddresses.find((addr) => addr.id === selectedId)
      : undefined;
    onChange(selectedId, address);
  };

  if (isLoading) {
    return <Spin size="small" />;
  }

  return (
    <div>
      <Select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder || `Select ${type === 'all' ? 'address' : `${type} address`}`}
        style={{ width: '100%' }}
        allowClear
        notFoundContent={
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No addresses found" />
        }
        dropdownRender={(menu) => (
          <>
            {menu}
            {(allowCustom || onAddNew) && (
              <>
                <Divider style={{ margin: '8px 0' }} />
                <Button
                  type="text"
                  icon={<PlusOutlined />}
                  onClick={onAddNew}
                  style={{ width: '100%', textAlign: 'left' }}
                >
                  Add New Address
                </Button>
              </>
            )}
          </>
        )}
      >
        {filteredAddresses.map((address) => (
          <Select.Option key={address.id} value={address.id}>
            <Space>
              <EnvironmentOutlined />
              <span>
                {address.label}
                {address.isDefault && (
                  <StarFilled style={{ color: '#faad14', marginLeft: 8, fontSize: 12 }} />
                )}
              </span>
            </Space>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatAddressDisplay(address)}
            </Text>
          </Select.Option>
        ))}
      </Select>

      {selectedAddress && (
        <div
          style={{
            marginTop: 8,
            padding: 12,
            background: '#f5f5f5',
            borderRadius: 6,
          }}
        >
          <Text strong>{selectedAddress.label}</Text>
          {selectedAddress.attention && (
            <Text type="secondary" style={{ marginLeft: 8 }}>
              (Attn: {selectedAddress.attention})
            </Text>
          )}
          <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>
            {selectedAddress.addressLine1}
            {selectedAddress.addressLine2 && <>, {selectedAddress.addressLine2}</>}
            <br />
            {selectedAddress.postcode} {selectedAddress.city}
            <br />
            {selectedAddress.state}, {selectedAddress.country}
          </Paragraph>
          {selectedAddress.phone && <Text type="secondary">Tel: {selectedAddress.phone}</Text>}
        </div>
      )}
    </div>
  );
}
