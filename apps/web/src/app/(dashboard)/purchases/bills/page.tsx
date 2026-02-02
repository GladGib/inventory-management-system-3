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
  Select,
  DatePicker,
  Modal,
  Progress,
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
  CheckOutlined,
  DollarOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { useBills, useApproveBill } from '@/hooks/use-purchases';
import { Bill, BillStatus, BillQueryParams } from '@/lib/purchases';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

const statusColors: Record<BillStatus, string> = {
  DRAFT: 'default',
  RECEIVED: 'blue',
  APPROVED: 'cyan',
  PAID: 'green',
  PARTIALLY_PAID: 'orange',
  OVERDUE: 'red',
  VOID: 'default',
};

export default function BillsPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<BillQueryParams>({
    page: 1,
    limit: 25,
  });

  const queryParams = useMemo(() => ({ ...filters }), [filters]);

  const { data, isLoading, isFetching } = useBills(queryParams);
  const approveBill = useApproveBill();

  const handleApprove = (record: Bill) => {
    confirm({
      title: 'Approve Bill',
      icon: <CheckOutlined />,
      content: `Approve bill ${record.billNumber}?`,
      onOk: () => approveBill.mutate(record.id),
    });
  };

  const getActionMenuItems = (record: Bill): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View',
        onClick: () => router.push(`/purchases/bills/${record.id}`),
      },
      {
        key: 'print',
        icon: <PrinterOutlined />,
        label: 'Print',
      },
    ];

    if (record.status === 'RECEIVED') {
      items.push({
        key: 'approve',
        icon: <CheckOutlined />,
        label: 'Approve',
        onClick: () => handleApprove(record),
      });
    }

    if (['APPROVED', 'PARTIALLY_PAID', 'OVERDUE'].includes(record.status)) {
      items.push({
        key: 'payment',
        icon: <DollarOutlined />,
        label: 'Record Payment',
        onClick: () => router.push(`/purchases/payments/new?billId=${record.id}`),
      });
    }

    return items;
  };

  const columns: TableColumnsType<Bill> = [
    {
      title: 'Bill #',
      dataIndex: 'billNumber',
      key: 'billNumber',
      width: 130,
      render: (num: string, record: Bill) => (
        <Link href={`/purchases/bills/${record.id}`} style={{ fontWeight: 500 }}>
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
      title: 'Vendor Invoice',
      dataIndex: 'vendorInvoiceNumber',
      key: 'vendorInvoiceNumber',
      width: 130,
      render: (num: string | undefined) => num || '-',
    },
    {
      title: 'Date',
      dataIndex: 'billDate',
      key: 'billDate',
      width: 110,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Due',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 110,
      render: (date: string, record: Bill) => {
        const isOverdue = dayjs(date).isBefore(dayjs()) && record.balance > 0;
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
      width: 120,
      render: (status: BillStatus) => (
        <Tag color={statusColors[status]}>{status.replace('_', ' ')}</Tag>
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
        const percent = (Number(record.amountPaid) / Number(record.total)) * 100;
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
        <span style={{ color: balance > 0 ? '#fa8c16' : '#52c41a' }}>
          RM {Number(balance).toFixed(2)}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      align: 'center',
      render: (_: unknown, record: Bill) => (
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
          Bills
        </Title>
        <Link href="/purchases/bills/new">
          <Button type="primary" icon={<PlusOutlined />}>
            New Bill
          </Button>
        </Link>
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
              style={{ width: 140 }}
              allowClear
              value={filters.status}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'RECEIVED', label: 'Received' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
                { value: 'PAID', label: 'Paid' },
                { value: 'OVERDUE', label: 'Overdue' },
              ]}
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
            showTotal: (total) => `Total ${total} bills`,
          }}
        />
      </Card>
    </div>
  );
}
