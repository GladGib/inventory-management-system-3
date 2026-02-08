'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import {
  Card,
  Table,
  Typography,
  Tag,
  Space,
  Tooltip,
} from 'antd';
import type { TableColumnsType, TablePaginationConfig } from 'antd';
import {
  DollarOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useVendorPayments } from '@/hooks/use-vendor-portal';
import type { VendorPayment } from '@/lib/purchases';
import type { VendorPaymentQueryParams } from '@/lib/vendor-portal';

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

const paymentMethodColors: Record<string, string> = {
  CASH: 'green',
  BANK_TRANSFER: 'blue',
  CHEQUE: 'orange',
  CREDIT_CARD: 'purple',
  FPX: 'cyan',
  DUITNOW: 'magenta',
  GRABPAY: 'lime',
  TNG_EWALLET: 'geekblue',
  OTHER: 'default',
};

export default function VendorPaymentsPage() {
  const [filters, setFilters] = useState<VendorPaymentQueryParams>({
    page: 1,
    limit: 25,
  });

  const queryParams = useMemo(() => ({ ...filters }), [filters]);
  const { data, isLoading, isFetching } = useVendorPayments(queryParams);

  const columns: TableColumnsType<VendorPayment> = [
    {
      title: 'Payment #',
      dataIndex: 'paymentNumber',
      key: 'paymentNumber',
      width: 150,
      render: (num: string) => <Text strong>{num}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 140,
      render: (method: string) => (
        <Tag color={paymentMethodColors[method] || 'default'}>
          {paymentMethodLabels[method] || method.replace(/_/g, ' ')}
        </Tag>
      ),
    },
    {
      title: 'Reference',
      dataIndex: 'referenceNumber',
      key: 'referenceNumber',
      width: 140,
      render: (ref: string | undefined) => ref || '-',
    },
    {
      title: 'Applied To',
      key: 'allocations',
      width: 200,
      render: (_: unknown, record: VendorPayment) => {
        if (!record.allocations || record.allocations.length === 0) {
          return <Text type="secondary">-</Text>;
        }
        return (
          <Space direction="vertical" size={0}>
            {record.allocations.map((alloc) => (
              <Tooltip
                key={alloc.billId}
                title={`RM ${Number(alloc.amount).toFixed(2)} applied`}
              >
                <Link href={`/portal/vendor/bills/${alloc.billId}`}>
                  <Space size={4}>
                    <LinkOutlined style={{ fontSize: 12 }} />
                    <Text style={{ fontSize: 13 }}>
                      {alloc.bill.billNumber}
                    </Text>
                  </Space>
                </Link>
              </Tooltip>
            ))}
          </Space>
        );
      },
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      align: 'right',
      render: (amount: number) => (
        <Text strong style={{ color: '#52c41a' }}>
          RM {Number(amount).toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (notes: string | undefined) =>
        notes ? (
          <Tooltip title={notes}>
            <Text type="secondary" ellipsis>
              {notes}
            </Text>
          </Tooltip>
        ) : (
          '-'
        ),
    },
  ];

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setFilters((prev) => ({
      ...prev,
      page: pagination.current || 1,
      limit: pagination.pageSize || 25,
    }));
  };

  // Calculate total for the current page
  const pageTotal = useMemo(() => {
    if (!data?.data) return 0;
    return data.data.reduce((sum, p) => sum + Number(p.amount), 0);
  }, [data?.data]);

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
          <Space>
            <DollarOutlined />
            Payment History
          </Space>
        </Title>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading || isFetching}
          onChange={handleTableChange}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total: data?.meta?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} payments`,
          }}
          summary={() =>
            data?.data && data.data.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={5}>
                    <Text strong>Page Total</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    <Text strong style={{ color: '#52c41a' }}>
                      RM {pageTotal.toFixed(2)}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} />
                </Table.Summary.Row>
              </Table.Summary>
            ) : null
          }
        />
      </Card>
    </div>
  );
}
