'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Table, Tag, Typography, Select, Space, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { portalCustomerService, PortalOrder } from '@/lib/portal-api';

const { Title } = Typography;

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const statusColors: Record<string, string> = {
  DRAFT: 'default',
  CONFIRMED: 'processing',
  PACKED: 'cyan',
  SHIPPED: 'blue',
  DELIVERED: 'green',
  CLOSED: 'default',
  CANCELLED: 'red',
};

export default function PortalOrdersPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'orders', statusFilter, page, pageSize],
    queryFn: () =>
      portalCustomerService.getOrders({
        status: statusFilter || undefined,
        page,
        limit: pageSize,
      }),
  });

  const columns = [
    {
      title: 'Order #',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text: string, record: PortalOrder) => (
        <a onClick={() => router.push(`/portal/orders/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Order Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>{status.replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Payment',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (status: string) => {
        const colors: Record<string, string> = {
          UNPAID: 'orange',
          PARTIALLY_PAID: 'blue',
          PAID: 'green',
        };
        return <Tag color={colors[status] || 'default'}>{status.replace(/_/g, ' ')}</Tag>;
      },
    },
    {
      title: 'Shipment',
      dataIndex: 'shipmentStatus',
      key: 'shipmentStatus',
      render: (status: string) => {
        const colors: Record<string, string> = {
          NOT_SHIPPED: 'default',
          PARTIALLY_SHIPPED: 'blue',
          SHIPPED: 'green',
        };
        return <Tag color={colors[status] || 'default'}>{status.replace(/_/g, ' ')}</Tag>;
      },
    },
    {
      title: 'Items',
      dataIndex: '_count',
      key: 'items',
      render: (count: { items: number }) => count.items,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      align: 'right' as const,
      render: (total: number) =>
        `RM ${Number(total).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`,
    },
    {
      title: '',
      key: 'action',
      width: 60,
      render: (_: any, record: PortalOrder) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/portal/orders/${record.id}`)}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          My Orders
        </Title>
        <Space>
          <Select
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            options={statusOptions}
            style={{ width: 180 }}
            placeholder="Filter by status"
          />
        </Space>
      </div>

      <Card bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: data?.meta?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} orders`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
}
