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
} from 'antd';
import type { TableColumnsType, TablePaginationConfig } from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useVendorPurchaseOrders } from '@/hooks/use-vendor-portal';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/lib/purchases';
import type { VendorPOQueryParams } from '@/lib/vendor-portal';

const { Title } = Typography;

const statusColors: Record<string, string> = {
  DRAFT: 'default',
  ISSUED: 'blue',
  PARTIALLY_RECEIVED: 'orange',
  RECEIVED: 'green',
  CLOSED: 'default',
  CANCELLED: 'red',
};

export default function VendorPurchaseOrdersPage() {
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<VendorPOQueryParams>({
    page: 1,
    limit: 25,
  });

  const queryParams = useMemo(() => ({ ...filters }), [filters]);
  const { data, isLoading, isFetching } = useVendorPurchaseOrders(queryParams);

  const columns: TableColumnsType<PurchaseOrder> = [
    {
      title: 'PO #',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 140,
      render: (num: string, record: PurchaseOrder) => (
        <Link
          href={`/portal/vendor/purchase-orders/${record.id}`}
          style={{ fontWeight: 500 }}
        >
          {num}
        </Link>
      ),
    },
    {
      title: 'Order Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Expected Date',
      dataIndex: 'expectedDate',
      key: 'expectedDate',
      width: 120,
      render: (date: string | null) =>
        date ? dayjs(date).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {status.replace(/_/g, ' ')}
        </Tag>
      ),
    },
    {
      title: 'Items',
      key: 'itemCount',
      width: 80,
      align: 'center',
      render: (_: unknown, record: PurchaseOrder) =>
        record.items?.length || 0,
    },
    {
      title: 'Receive Status',
      dataIndex: 'receiveStatus',
      key: 'receiveStatus',
      width: 140,
      render: (status: string) => {
        const colors: Record<string, string> = {
          NOT_RECEIVED: 'default',
          PARTIALLY_RECEIVED: 'orange',
          RECEIVED: 'green',
        };
        return (
          <Tag color={colors[status] || 'default'}>
            {status.replace(/_/g, ' ')}
          </Tag>
        );
      },
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 130,
      align: 'right',
      render: (total: number) => `RM ${Number(total).toFixed(2)}`,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_: unknown, record: PurchaseOrder) => (
        <Link href={`/portal/vendor/purchase-orders/${record.id}`}>
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

  // Client-side search filtering
  const filteredData = useMemo(() => {
    if (!data?.data || !searchText) return data?.data || [];
    const search = searchText.toLowerCase();
    return data.data.filter(
      (po) =>
        po.orderNumber.toLowerCase().includes(search) ||
        po.referenceNumber?.toLowerCase().includes(search),
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
          Purchase Orders
        </Title>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="Search by PO number..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder="Status"
              style={{ width: 180 }}
              allowClear
              value={filters.status}
              onChange={(value) =>
                setFilters((prev) => ({ ...prev, status: value, page: 1 }))
              }
              options={[
                { value: 'ISSUED', label: 'Issued (Pending)' },
                { value: 'PARTIALLY_RECEIVED', label: 'Partially Received' },
                { value: 'RECEIVED', label: 'Received' },
                { value: 'CLOSED', label: 'Closed' },
                { value: 'CANCELLED', label: 'Cancelled' },
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
            showTotal: (total) => `Total ${total} purchase orders`,
          }}
        />
      </Card>
    </div>
  );
}
