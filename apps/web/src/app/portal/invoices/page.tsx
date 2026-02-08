'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Table, Tag, Typography, Select, Space, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { portalCustomerService, PortalInvoice } from '@/lib/portal-api';

const { Title, Text } = Typography;

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'SENT', label: 'Sent' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
];

const statusColors: Record<string, string> = {
  DRAFT: 'default',
  SENT: 'processing',
  PARTIALLY_PAID: 'orange',
  PAID: 'green',
  OVERDUE: 'red',
  VOID: 'default',
};

export default function PortalInvoicesPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'invoices', statusFilter, page, pageSize],
    queryFn: () =>
      portalCustomerService.getInvoices({
        status: statusFilter || undefined,
        page,
        limit: pageSize,
      }),
  });

  const columns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (text: string, record: PortalInvoice) => (
        <a onClick={() => router.push(`/portal/invoices/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Order #',
      key: 'orderNumber',
      render: (_: any, record: PortalInvoice) => record.salesOrder?.orderNumber || '-',
    },
    {
      title: 'Invoice Date',
      dataIndex: 'invoiceDate',
      key: 'invoiceDate',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string, record: PortalInvoice) => {
        const d = new Date(date);
        const isOverdue =
          d < new Date() && record.status !== 'PAID' && record.status !== 'VOID';
        return (
          <Text type={isOverdue ? 'danger' : undefined}>
            {d.toLocaleDateString()}
          </Text>
        );
      },
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
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      align: 'right' as const,
      render: (total: number) =>
        `RM ${Number(total).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Paid',
      dataIndex: 'amountPaid',
      key: 'amountPaid',
      align: 'right' as const,
      render: (paid: number) =>
        `RM ${Number(paid).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right' as const,
      render: (balance: number) => (
        <Text type={Number(balance) > 0 ? 'danger' : 'success'} strong>
          RM {Number(balance).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 60,
      render: (_: any, record: PortalInvoice) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/portal/invoices/${record.id}`)}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          My Invoices
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
            showTotal: (total) => `Total ${total} invoices`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
}
