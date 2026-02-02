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
  SendOutlined,
  DollarOutlined,
  CloseOutlined,
  PrinterOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useInvoices, useSendInvoice, useVoidInvoice } from '@/hooks/use-sales';
import { Invoice, InvoiceStatus, InvoiceQueryParams } from '@/lib/sales';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

const statusColors: Record<InvoiceStatus, string> = {
  DRAFT: 'default',
  SENT: 'blue',
  PAID: 'green',
  PARTIALLY_PAID: 'orange',
  OVERDUE: 'red',
  VOID: 'default',
};

export default function InvoicesPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<InvoiceQueryParams>({
    page: 1,
    limit: 25,
  });

  const queryParams = useMemo(() => ({ ...filters }), [filters]);

  const { data, isLoading, isFetching } = useInvoices(queryParams);
  const sendInvoice = useSendInvoice();
  const voidInvoice = useVoidInvoice();

  const handleSend = (record: Invoice) => {
    confirm({
      title: 'Send Invoice',
      icon: <SendOutlined />,
      content: `Mark invoice ${record.invoiceNumber} as sent?`,
      onOk: () => sendInvoice.mutate(record.id),
    });
  };

  const handleVoid = (record: Invoice) => {
    confirm({
      title: 'Void Invoice',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to void invoice ${record.invoiceNumber}? This cannot be undone.`,
      okText: 'Void',
      okType: 'danger',
      onOk: () => voidInvoice.mutate(record.id),
    });
  };

  const getActionMenuItems = (record: Invoice): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View',
        onClick: () => router.push(`/sales/invoices/${record.id}`),
      },
      {
        key: 'print',
        icon: <PrinterOutlined />,
        label: 'Print',
      },
    ];

    if (record.status === 'DRAFT') {
      items.push({
        key: 'send',
        icon: <SendOutlined />,
        label: 'Mark as Sent',
        onClick: () => handleSend(record),
      });
    }

    if (['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(record.status)) {
      items.push({
        key: 'payment',
        icon: <DollarOutlined />,
        label: 'Record Payment',
        onClick: () => router.push(`/sales/payments/new?invoiceId=${record.id}`),
      });
    }

    if (['DRAFT', 'SENT'].includes(record.status)) {
      items.push(
        { type: 'divider' },
        {
          key: 'void',
          icon: <CloseOutlined />,
          label: 'Void Invoice',
          danger: true,
          onClick: () => handleVoid(record),
        }
      );
    }

    return items;
  };

  const columns: TableColumnsType<Invoice> = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 130,
      render: (num: string, record: Invoice) => (
        <Link href={`/sales/invoices/${record.id}`} style={{ fontWeight: 500 }}>
          {num}
        </Link>
      ),
    },
    {
      title: 'Customer',
      dataIndex: ['customer', 'displayName'],
      key: 'customer',
      ellipsis: true,
    },
    {
      title: 'Date',
      dataIndex: 'invoiceDate',
      key: 'invoiceDate',
      width: 110,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Due',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 110,
      render: (date: string, record: Invoice) => {
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
      render: (status: InvoiceStatus) => (
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
      render: (_: unknown, record: Invoice) => {
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
      render: (_: unknown, record: Invoice) => (
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
          Invoices
        </Title>
        <Link href="/sales/invoices/new">
          <Button type="primary" icon={<PlusOutlined />}>
            New Invoice
          </Button>
        </Link>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="Search invoices..."
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
                { value: 'SENT', label: 'Sent' },
                { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
                { value: 'PAID', label: 'Paid' },
                { value: 'OVERDUE', label: 'Overdue' },
                { value: 'VOID', label: 'Void' },
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
            showTotal: (total) => `Total ${total} invoices`,
          }}
        />
      </Card>
    </div>
  );
}
