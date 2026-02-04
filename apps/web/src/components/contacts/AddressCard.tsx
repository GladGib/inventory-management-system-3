'use client';

import { Card, Tag, Space, Dropdown, Button, Typography } from 'antd';
import {
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
  EnvironmentOutlined,
  PhoneOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { Address } from '@/lib/addresses';

const { Text, Paragraph } = Typography;

interface AddressCardProps {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  showActions?: boolean;
}

export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  showActions = true,
}: AddressCardProps) {
  const formatAddress = () => {
    const parts = [
      address.addressLine1,
      address.addressLine2,
      `${address.postcode} ${address.city}`,
      address.state,
      address.country,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
      onClick: onEdit,
    },
    {
      key: 'setDefault',
      icon: address.isDefault ? <StarFilled /> : <StarOutlined />,
      label: address.isDefault ? 'Default Address' : 'Set as Default',
      disabled: address.isDefault,
      onClick: onSetDefault,
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: onDelete,
    },
  ];

  return (
    <Card
      size="small"
      style={{ marginBottom: 12 }}
      extra={
        showActions && (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        )
      }
      title={
        <Space>
          <EnvironmentOutlined />
          <span>{address.label}</span>
          {address.isDefault && (
            <Tag color="gold">
              <StarFilled style={{ marginRight: 4 }} />
              Default
            </Tag>
          )}
        </Space>
      }
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Paragraph style={{ marginBottom: 8 }} copyable={{ text: formatAddress() }}>
          {address.addressLine1}
          {address.addressLine2 && (
            <>
              <br />
              {address.addressLine2}
            </>
          )}
          <br />
          {address.postcode} {address.city}
          <br />
          {address.state}, {address.country}
        </Paragraph>

        <Space wrap>
          {address.isBilling && <Tag color="blue">Billing</Tag>}
          {address.isShipping && <Tag color="green">Shipping</Tag>}
        </Space>

        {(address.phone || address.attention) && (
          <Space direction="vertical" size={0}>
            {address.attention && (
              <Text type="secondary">
                <UserOutlined style={{ marginRight: 8 }} />
                {address.attention}
              </Text>
            )}
            {address.phone && (
              <Text type="secondary">
                <PhoneOutlined style={{ marginRight: 8 }} />
                {address.phone}
              </Text>
            )}
          </Space>
        )}
      </Space>
    </Card>
  );
}
