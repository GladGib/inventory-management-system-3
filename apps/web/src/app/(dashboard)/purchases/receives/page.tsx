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
import { usePurchaseReceives } from '@/hooks/use-purchases';
import { PurchaseReceive, ReceiveQueryParams } from '@/lib/purchases';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function PurchaseReceivesPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<ReceiveQueryParams>({
    page: 1,
    limit: 25,
  });

  const queryParams = useMemo(() => ({ ...filters }), [filters]);

  const { data, isLoading, isFetching } = usePurchaseReceives(queryParams);

  const getActionMenuItems = (record: PurchaseReceive): MenuProps['items'] => [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: 'View Details',
      onClick: () => router.push(`/purchases/receives/${record.id}`),
    },
    {
      key: 'print',
      icon: <PrinterOutlined />,
      label: 'Print',
    },
  ];

  const columns: TableColumnsType<PurchaseReceive> = [
    {
      title: 'Receive #',
      dataIndex: 'receiveNumber',
      key: 'receiveNumber',
      width: 130,
      render: (num: string, record: PurchaseReceive) => (
        <Link href={`/purchases/receives/${record.id}`} style={{ fontWeight: 500 }}>
          {num}
        </Link>
      ),
    },
    {
      title: 'PO #',
      dataIndex: ['purchaseOrder', 'orderNumber'],
      key: 'purchaseOrder',
      width: 130,
      render: (num: string, record: PurchaseReceive) =>
        num ? (
          <Link href={`/purchases/orders/${record.purchaseOrderId}`}>{num}</Link>
        ) : (
          '-'
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
      dataIndex: 'receiveDate',
      key: 'receiveDate',
      width: 110,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Items',
      key: 'items',
      width: 80,
      align: 'center',
      render: (_: unknown, record: PurchaseReceive) => record.items?.length || 0,
    },
    {
      title: 'Total Qty',
      key: 'totalQuantity',
      width: 100,
      align: 'right',
      render: (_: unknown, record: PurchaseReceive) =>
        record.items?.reduce((sum, item) => sum + (item.quantityReceived || 0), 0) || 0,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => {
        const colors: Record<string, string> = {
          PENDING: 'default',
          RECEIVED: 'green',
          PARTIAL: 'orange',
        };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      align: 'center',
      render: (_: unknown, record: PurchaseReceive) => (
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
          Purchase Receives
        </Title>
        <Link href="/purchases/receives/new">
          <Button type="primary" icon={<PlusOutlined />}>
            New Receive
          </Button>
        </Link>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="Search receives..."
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
            showTotal: (total) => `Total ${total} receives`,
          }}
        />
      </Card>
    </div>
  );
}
