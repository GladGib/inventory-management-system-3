'use client';

import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Dropdown,
  type MenuProps,
  type TableColumnsType,
} from 'antd';
import { PlusOutlined, MoreOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import { useWarehouses } from '@/hooks/use-inventory';
import { Warehouse } from '@/lib/inventory';

const { Title } = Typography;

export default function WarehousesPage() {
  const { data: warehouses, isLoading } = useWarehouses();

  const getActionMenuItems = (_record: Warehouse): MenuProps['items'] => [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: 'View Details',
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
    },
  ];

  const columns: TableColumnsType<Warehouse> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Warehouse) => (
        <Space>
          <span style={{ fontWeight: 500 }}>{name}</span>
          {record.isDefault && <Tag color="blue">Default</Tag>}
        </Space>
      ),
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      render: (address: string | undefined) => address || '-',
    },
    {
      title: 'Total Items',
      dataIndex: 'totalItems',
      key: 'totalItems',
      width: 120,
      align: 'right',
      render: (count: number) => count || 0,
    },
    {
      title: 'Stock Value',
      dataIndex: 'totalStockValue',
      key: 'totalStockValue',
      width: 140,
      align: 'right',
      render: (value: number) => `RM ${Number(value || 0).toFixed(2)}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'default'}>{status}</Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      align: 'center',
      render: (_: unknown, record: Warehouse) => (
        <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Warehouses
        </Title>
        <Button type="primary" icon={<PlusOutlined />}>
          New Warehouse
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={warehouses || []}
          rowKey="id"
          loading={isLoading}
          pagination={false}
        />
      </Card>
    </div>
  );
}
