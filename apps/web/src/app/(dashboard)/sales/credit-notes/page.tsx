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
  type MenuProps,
  type TableColumnsType,
  type TablePaginationConfig,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  MoreOutlined,
  EyeOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useCreditNotes } from '@/hooks/use-sales';
import { CreditNote, CreditNoteStatus, CreditNoteQueryParams } from '@/lib/sales';

const { Title } = Typography;

const statusColors: Record<CreditNoteStatus, string> = {
  OPEN: 'blue',
  PARTIALLY_APPLIED: 'orange',
  FULLY_APPLIED: 'green',
  VOID: 'red',
};

export default function CreditNotesPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<CreditNoteQueryParams>({
    page: 1,
    limit: 25,
  });

  const queryParams = useMemo(
    () => ({
      ...filters,
    }),
    [filters]
  );

  const { data, isLoading, isFetching } = useCreditNotes(queryParams);

  const getActionMenuItems = (record: CreditNote): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View',
        onClick: () => router.push(`/sales/credit-notes/${record.id}`),
      },
    ];

    if (record.status === 'OPEN' || record.status === 'PARTIALLY_APPLIED') {
      items.push({
        key: 'apply',
        icon: <DollarOutlined />,
        label: 'Apply to Invoice',
        onClick: () => router.push(`/sales/credit-notes/${record.id}?apply=true`),
      });
    }

    return items;
  };

  const columns: TableColumnsType<CreditNote> = [
    {
      title: 'Credit Note #',
      dataIndex: 'creditNumber',
      key: 'creditNumber',
      width: 140,
      render: (num: string, record: CreditNote) => (
        <Link href={`/sales/credit-notes/${record.id}`} style={{ fontWeight: 500 }}>
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
      dataIndex: 'creditDate',
      key: 'creditDate',
      width: 110,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: CreditNoteStatus) => (
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
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      width: 120,
      align: 'right',
      render: (balance: number) => (
        <span style={{ color: balance > 0 ? '#1890ff' : undefined }}>
          RM {Number(balance).toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Applications',
      dataIndex: '_count',
      key: 'applications',
      width: 110,
      align: 'center',
      render: (_count: { applications: number } | undefined) => _count?.applications || 0,
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      align: 'center',
      render: (_: unknown, record: CreditNote) => (
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
          Credit Notes
        </Title>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="Search credit notes..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder="Status"
              style={{ width: 150 }}
              allowClear
              value={filters.status}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
              options={[
                { value: 'OPEN', label: 'Open' },
                { value: 'PARTIALLY_APPLIED', label: 'Partially Applied' },
                { value: 'FULLY_APPLIED', label: 'Fully Applied' },
                { value: 'VOID', label: 'Void' },
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
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading || isFetching}
          onChange={handleTableChange}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total: data?.meta?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} credit notes`,
          }}
        />
      </Card>
    </div>
  );
}
