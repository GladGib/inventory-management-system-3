'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
  Typography,
  Dropdown,
  DatePicker,
  type MenuProps,
  type TableColumnsType,
  type TablePaginationConfig,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  MoreOutlined,
  EyeOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { useVendorPayments } from '@/hooks/use-purchases';
import { VendorPayment, PaymentQueryParams } from '@/lib/purchases';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const paymentMethodColors: Record<string, string> = {
  CASH: 'green',
  BANK_TRANSFER: 'blue',
  CHEQUE: 'orange',
  CREDIT_CARD: 'purple',
  EWALLET: 'cyan',
};

export default function PaymentsMadePage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<PaymentQueryParams>({
    page: 1,
    limit: 25,
  });

  const queryParams = useMemo(() => ({ ...filters }), [filters]);

  const { data, isLoading, isFetching } = useVendorPayments(queryParams);

  const getActionMenuItems = (record: VendorPayment): MenuProps['items'] => [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: 'View Details',
      onClick: () => router.push(`/purchases/payments/${record.id}`),
    },
    {
      key: 'print',
      icon: <PrinterOutlined />,
      label: 'Print Receipt',
    },
  ];

  const columns: TableColumnsType<VendorPayment> = [
    {
      title: 'Payment #',
      dataIndex: 'paymentNumber',
      key: 'paymentNumber',
      width: 130,
      render: (num: string, record: VendorPayment) => (
        <Link href={`/purchases/payments/${record.id}`} style={{ fontWeight: 500 }}>
          {num}
        </Link>
      ),
    },
    {
      title: 'Vendor',
      dataIndex: ['vendor', 'displayName'],
      key: 'vendor',
      ellipsis: true,
    },
    {
      title: 'Date',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      width: 110,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 130,
      render: (method: string) => (
        <Tag color={paymentMethodColors[method] || 'default'}>{method.replace('_', ' ')}</Tag>
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
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      align: 'right',
      render: (amount: number) => (
        <span style={{ fontWeight: 500, color: '#ff4d4f' }}>RM {Number(amount).toFixed(2)}</span>
      ),
    },
    {
      title: 'Applied To',
      key: 'allocations',
      width: 150,
      render: (_: unknown, record: VendorPayment) => {
        const count = record.allocations?.length || 0;
        return count > 0 ? `${count} bill(s)` : '-';
      },
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      align: 'center',
      render: (_: unknown, record: VendorPayment) => (
        <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
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
          Payments Made
        </Title>
        <Link href="/purchases/payments/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Record Payment
          </Button>
        </Link>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="Search payments..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <RangePicker
              onChange={(dates) => {
                setFilters((prev) => ({
                  ...prev,
                  fromDate: dates?.[0]?.toISOString(),
                  toDate: dates?.[1]?.toISOString(),
                  page: 1,
                }));
              }}
            />
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                setSearchText('');
                setFilters({ page: 1, limit: 25 });
              }}
            >
              Reset
            </Button>
          </Space>
        </div>

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
        />
      </Card>
    </div>
  );
}
