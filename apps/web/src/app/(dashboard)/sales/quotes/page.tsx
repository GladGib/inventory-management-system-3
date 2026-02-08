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
  EditOutlined,
  SendOutlined,
  DeleteOutlined,
  SwapOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  useQuotes,
  useDeleteQuote,
  useSendQuote,
  useConvertToOrder,
} from '@/hooks/use-quotes';
import { Quote, QuoteStatus, QuoteQueryParams } from '@/lib/quotes';
import { TableSkeleton } from '@/components/skeletons';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

const statusColors: Record<QuoteStatus, string> = {
  DRAFT: 'default',
  SENT: 'blue',
  ACCEPTED: 'green',
  EXPIRED: 'orange',
  REJECTED: 'red',
  CONVERTED: 'purple',
};

export default function QuotesPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<QuoteQueryParams>({
    page: 1,
    limit: 25,
  });

  const queryParams = useMemo(
    () => ({
      ...filters,
    }),
    [filters]
  );

  const { data, isLoading, isFetching } = useQuotes(queryParams);
  const deleteQuote = useDeleteQuote();
  const sendQuote = useSendQuote();
  const convertToOrder = useConvertToOrder();

  const handleDelete = (record: Quote) => {
    confirm({
      title: 'Delete Quote',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete quote ${record.quoteNumber}?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => deleteQuote.mutate(record.id),
    });
  };

  const handleSend = (record: Quote) => {
    confirm({
      title: 'Send Quote',
      icon: <SendOutlined />,
      content: `Mark quote ${record.quoteNumber} as sent?`,
      onOk: () => sendQuote.mutate(record.id),
    });
  };

  const handleConvert = (record: Quote) => {
    confirm({
      title: 'Convert to Sales Order',
      icon: <SwapOutlined />,
      content: `Convert quote ${record.quoteNumber} to a sales order? This action cannot be undone.`,
      okText: 'Convert',
      onOk: () =>
        convertToOrder.mutate(record.id, {
          onSuccess: (salesOrder) => {
            router.push(`/sales/orders/${salesOrder.id}`);
          },
        }),
    });
  };

  const getActionMenuItems = (record: Quote): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View',
        onClick: () => router.push(`/sales/quotes/${record.id}`),
      },
    ];

    if (record.status === 'DRAFT') {
      items.push(
        {
          key: 'edit',
          icon: <EditOutlined />,
          label: 'Edit',
          onClick: () => router.push(`/sales/quotes/${record.id}/edit`),
        },
        {
          key: 'send',
          icon: <SendOutlined />,
          label: 'Mark as Sent',
          onClick: () => handleSend(record),
        }
      );
    }

    if (record.status === 'SENT') {
      items.push({
        key: 'send-again',
        icon: <SendOutlined />,
        label: 'Resend',
        onClick: () => handleSend(record),
      });
    }

    if (['DRAFT', 'SENT', 'ACCEPTED'].includes(record.status)) {
      items.push({
        key: 'convert',
        icon: <SwapOutlined />,
        label: 'Convert to Order',
        onClick: () => handleConvert(record),
      });
    }

    if (record.status === 'DRAFT') {
      items.push(
        { type: 'divider' },
        {
          key: 'delete',
          icon: <DeleteOutlined />,
          label: 'Delete',
          danger: true,
          onClick: () => handleDelete(record),
        }
      );
    }

    return items;
  };

  const columns: TableColumnsType<Quote> = [
    {
      title: 'Quote #',
      dataIndex: 'quoteNumber',
      key: 'quoteNumber',
      width: 130,
      render: (num: string, record: Quote) => (
        <Link href={`/sales/quotes/${record.id}`} style={{ fontWeight: 500 }}>
          {num}
        </Link>
      ),
    },
    {
      title: 'Customer',
      dataIndex: ['customer', 'displayName'],
      key: 'customer',
      ellipsis: true,
      render: (name: string, record: Quote) =>
        name || record.contactPersonName || '-',
    },
    {
      title: 'Date',
      dataIndex: 'quoteDate',
      key: 'quoteDate',
      width: 110,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Valid Until',
      dataIndex: 'validUntil',
      key: 'validUntil',
      width: 110,
      render: (date: string) => {
        const isExpired = dayjs(date).isBefore(dayjs(), 'day');
        return (
          <span style={{ color: isExpired ? '#ff4d4f' : undefined }}>
            {dayjs(date).format('DD/MM/YYYY')}
          </span>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: QuoteStatus) => <Tag color={statusColors[status]}>{status}</Tag>,
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
      title: '',
      key: 'actions',
      width: 50,
      align: 'center',
      render: (_: unknown, record: Quote) => (
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

  if (isLoading) {
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
            Sales Quotes
          </Title>
          <Link href="/sales/quotes/new">
            <Button type="primary" icon={<PlusOutlined />}>
              New Quote
            </Button>
          </Link>
        </div>
        <Card>
          <TableSkeleton rows={10} columns={7} />
        </Card>
      </div>
    );
  }

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
          Sales Quotes
        </Title>
        <Link href="/sales/quotes/new">
          <Button type="primary" icon={<PlusOutlined />}>
            New Quote
          </Button>
        </Link>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="Search quotes..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder="Status"
              style={{ width: 130 }}
              allowClear
              value={filters.status}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'SENT', label: 'Sent' },
                { value: 'ACCEPTED', label: 'Accepted' },
                { value: 'EXPIRED', label: 'Expired' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: 'CONVERTED', label: 'Converted' },
              ]}
            />
            <RangePicker
              onChange={(dates) => {
                setFilters((prev) => ({
                  ...prev,
                  dateFrom: dates?.[0]?.toISOString(),
                  dateTo: dates?.[1]?.toISOString(),
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
            showTotal: (total) => `Total ${total} quotes`,
          }}
        />
      </Card>
    </div>
  );
}
