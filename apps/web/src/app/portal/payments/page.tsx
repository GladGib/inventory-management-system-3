'use client';

import { useState } from 'react';
import { Card, Table, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { portalCustomerService, PortalPayment } from '@/lib/portal-api';

const { Title, Text } = Typography;

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  CREDIT_CARD: 'Credit Card',
  FPX: 'FPX',
  DUITNOW: 'DuitNow',
  GRABPAY: 'GrabPay',
  TNG_EWALLET: 'TNG eWallet',
  OTHER: 'Other',
};

export default function PortalPaymentsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'payments', page, pageSize],
    queryFn: () =>
      portalCustomerService.getPayments({
        page,
        limit: pageSize,
      }),
  });

  const columns = [
    {
      title: 'Payment #',
      dataIndex: 'paymentNumber',
      key: 'paymentNumber',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Payment Date',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method: string) => (
        <Tag>{paymentMethodLabels[method] || method.replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Reference',
      dataIndex: 'referenceNumber',
      key: 'referenceNumber',
      render: (ref: string | null) => ref || '-',
    },
    {
      title: 'Applied To',
      key: 'appliedTo',
      render: (_: any, record: PortalPayment) => {
        if (!record.allocations || record.allocations.length === 0) {
          return <Text type="secondary">Unallocated</Text>;
        }
        return (
          <div>
            {record.allocations.map((alloc, idx) => (
              <Tag key={idx} color="blue">
                {alloc.invoice.invoiceNumber}
              </Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (amount: number) => (
        <Text strong type="success">
          RM {Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (notes: string | null) => notes || '-',
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Payment History
      </Title>

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
            showTotal: (total) => `Total ${total} payments`,
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
