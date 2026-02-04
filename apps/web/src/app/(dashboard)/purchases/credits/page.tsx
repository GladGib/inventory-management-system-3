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
  DollarOutlined,
  StopOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  useVendorCredits,
  useVoidVendorCredit,
  useDeleteVendorCredit,
} from '@/hooks/use-purchases';
import { VendorCredit, VendorCreditStatus, VendorCreditQueryParams } from '@/lib/purchases';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

const statusColors: Record<VendorCreditStatus, string> = {
  OPEN: 'blue',
  PARTIALLY_APPLIED: 'orange',
  FULLY_APPLIED: 'green',
  VOID: 'red',
};

export default function VendorCreditsPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<VendorCreditQueryParams>({
    page: 1,
    limit: 25,
  });

  const queryParams = useMemo(
    () => ({
      ...filters,
    }),
    [filters]
  );

  const { data, isLoading, isFetching } = useVendorCredits(queryParams);
  const voidCredit = useVoidVendorCredit();
  const deleteCredit = useDeleteVendorCredit();

  const handleVoid = (record: VendorCredit) => {
    confirm({
      title: 'Void Vendor Credit',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to void credit ${record.creditNumber}? This action cannot be undone.`,
      okText: 'Void',
      okType: 'danger',
      onOk: () => voidCredit.mutate(record.id),
    });
  };

  const handleDelete = (record: VendorCredit) => {
    confirm({
      title: 'Delete Vendor Credit',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete credit ${record.creditNumber}? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => deleteCredit.mutate(record.id),
    });
  };

  const getActionMenuItems = (record: VendorCredit): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View',
        onClick: () => router.push(`/purchases/credits/${record.id}`),
      },
    ];

    if (record.status === 'OPEN') {
      items.push(
        {
          key: 'edit',
          icon: <EditOutlined />,
          label: 'Edit',
          onClick: () => router.push(`/purchases/credits/${record.id}/edit`),
        },
        {
          key: 'apply',
          icon: <DollarOutlined />,
          label: 'Apply to Bill',
          onClick: () => router.push(`/purchases/credits/${record.id}?apply=true`),
        }
      );
    }

    if (record.status === 'PARTIALLY_APPLIED') {
      items.push({
        key: 'apply',
        icon: <DollarOutlined />,
        label: 'Apply to Bill',
        onClick: () => router.push(`/purchases/credits/${record.id}?apply=true`),
      });
    }

    if (record.status === 'OPEN') {
      items.push(
        { type: 'divider' },
        {
          key: 'void',
          icon: <StopOutlined />,
          label: 'Void',
          danger: true,
          onClick: () => handleVoid(record),
        },
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

  const columns: TableColumnsType<VendorCredit> = [
    {
      title: 'Credit #',
      dataIndex: 'creditNumber',
      key: 'creditNumber',
      width: 140,
      render: (num: string, record: VendorCredit) => (
        <Link href={`/purchases/credits/${record.id}`} style={{ fontWeight: 500 }}>
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
      render: (status: VendorCreditStatus) => (
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
      render: (_: unknown, record: VendorCredit) => (
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
          Vendor Credits
        </Title>
        <Link href="/purchases/credits/new">
          <Button type="primary" icon={<PlusOutlined />}>
            New Vendor Credit
          </Button>
        </Link>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="Search credits..."
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
            showTotal: (total) => `Total ${total} credits`,
          }}
        />
      </Card>
    </div>
  );
}
