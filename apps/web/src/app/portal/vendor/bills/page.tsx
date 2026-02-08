'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
  Typography,
  Select,
  Progress,
} from 'antd';
import type { TableColumnsType, TablePaginationConfig } from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useVendorBills } from '@/hooks/use-vendor-portal';
import type { Bill, BillStatus } from '@/lib/purchases';
import type { VendorBillQueryParams } from '@/lib/vendor-portal';

const { Title, Text } = Typography;

const statusColors: Record<string, string> = {
  DRAFT: 'default',
  RECEIVED: 'blue',
  APPROVED: 'cyan',
  PAID: 'green',
  PARTIALLY_PAID: 'orange',
  OVERDUE: 'red',
  VOID: 'default',
};

export default function VendorBillsPage() {
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<VendorBillQueryParams>({
    page: 1,
    limit: 25,
  });

  const queryParams = useMemo(() => ({ ...filters }), [filters]);
  const { data, isLoading, isFetching } = useVendorBills(queryParams);

  const columns: TableColumnsType<Bill> = [
    {
      title: 'Bill #',
      dataIndex: 'billNumber',
      key: 'billNumber',
      width: 140,
      render: (num: string, record: Bill) => (
        <Link
          href={`/portal/vendor/bills/${record.id}`}
          style={{ fontWeight: 500 }}
        >
          {num}
        </Link>
      ),
    },
    {
      title: 'PO #',
      key: 'purchaseOrder',
      width: 140,
      render: (_: unknown, record: Bill) =>
        record.purchaseOrder ? (
          <Link href={`/portal/vendor/purchase-orders/${record.purchaseOrder.id}`}>
            {record.purchaseOrder.orderNumber}
          </Link>
        ) : (
          '-'
        ),
    },
    {
      title: 'Bill Date',
      dataIndex: 'billDate',
      key: 'billDate',
      width: 110,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 110,
      render: (date: string, record: Bill) => {
        const isOverdue =
          dayjs(date).isBefore(dayjs()) && Number(record.balance) > 0;
        return (
          <span style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
            {dayjs(date).format('DD/MM/YYYY')}
          </span>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {status.replace(/_/g, ' ')}
        </Tag>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right',
      render: (total: number) => `RM ${Number(total).toFixed(2)}`,
    },
    {
      title: 'Paid',
      key: 'paid',
      width: 150,
      render: (_: unknown, record: Bill) => {
        const percent =
          Number(record.total) > 0
            ? (Number(record.amountPaid) / Number(record.total)) * 100
            : 0;
        return (
          <div style={{ minWidth: 100 }}>
            <Progress
              percent={Math.round(percent)}
              size="small"
              status={record.status === 'PAID' ? 'success' : 'active'}
            />
          </div>
        );
      },
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      width: 120,
      align: 'right',
      render: (balance: number) => (
        <Text
          style={{
            color: Number(balance) > 0 ? '#fa8c16' : '#52c41a',
          }}
        >
          RM {Number(balance).toFixed(2)}
        </Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_: unknown, record: Bill) => (
        <Link href={`/portal/vendor/bills/${record.id}`}>
          <Button type="link" size="small" icon={<EyeOutlined />}>
            View
          </Button>
        </Link>
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

  const filteredData = useMemo(() => {
    if (!data?.data || !searchText) return data?.data || [];
    const search = searchText.toLowerCase();
    return data.data.filter(
      (bill) =>
        bill.billNumber.toLowerCase().includes(search) ||
        bill.vendorInvoiceNumber?.toLowerCase().includes(search),
    );
  }, [data?.data, searchText]);

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
          Bills
        </Title>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="Search bills..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder="Status"
              style={{ width: 160 }}
              allowClear
              value={filters.status}
              onChange={(value) =>
                setFilters((prev) => ({ ...prev, status: value, page: 1 }))
              }
              options={[
                { value: 'RECEIVED', label: 'Received' },
                { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
                { value: 'PAID', label: 'Paid' },
                { value: 'OVERDUE', label: 'Overdue' },
              ]}
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
          dataSource={filteredData}
          rowKey="id"
          loading={isLoading || isFetching}
          onChange={handleTableChange}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total: data?.meta?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} bills`,
          }}
        />
      </Card>
    </div>
  );
}
