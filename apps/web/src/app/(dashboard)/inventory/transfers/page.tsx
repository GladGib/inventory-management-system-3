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
  Typography,
  Select,
  Tag,
  DatePicker,
  type TableColumnsType,
  type TablePaginationConfig,
} from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { useTransfers, useWarehouses } from '@/hooks/use-inventory';
import { InventoryTransfer, TransferQueryParams, TransferStatus } from '@/lib/inventory';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const statusColors: Record<TransferStatus, string> = {
  DRAFT: 'default',
  IN_TRANSIT: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

export default function InventoryTransfersPage() {
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<TransferQueryParams>({
    page: 1,
    limit: 25,
  });

  const queryParams = useMemo(() => ({ ...filters }), [filters]);

  const { data, isLoading, isFetching } = useTransfers(queryParams);
  const { data: warehouses } = useWarehouses();

  const columns: TableColumnsType<InventoryTransfer> = [
    {
      title: 'Transfer #',
      dataIndex: 'transferNumber',
      key: 'transferNumber',
      width: 150,
      render: (num: string, record: InventoryTransfer) => (
        <Link href={`/inventory/transfers/${record.id}`} style={{ fontWeight: 500 }}>
          {num}
        </Link>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'transferDate',
      key: 'transferDate',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'From',
      dataIndex: ['sourceWarehouse', 'name'],
      key: 'sourceWarehouse',
      ellipsis: true,
    },
    {
      title: 'To',
      dataIndex: ['destinationWarehouse', 'name'],
      key: 'destinationWarehouse',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: TransferStatus) => (
        <Tag color={statusColors[status]}>{status.replace('_', ' ')}</Tag>
      ),
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
      width: 80,
      align: 'center',
      render: (items: unknown[]) => items?.length || 0,
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (notes: string) => notes || '-',
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
          Inventory Transfers
        </Title>
        <Link href="/inventory/transfers/new">
          <Button type="primary" icon={<PlusOutlined />}>
            New Transfer
          </Button>
        </Link>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="Search transfers..."
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
                { value: 'DRAFT', label: 'Draft' },
                { value: 'IN_TRANSIT', label: 'In Transit' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
            <Select
              placeholder="Warehouse"
              style={{ width: 180 }}
              allowClear
              value={filters.warehouseId}
              onChange={(value) => setFilters((prev) => ({ ...prev, warehouseId: value, page: 1 }))}
              options={(warehouses || []).map((w) => ({ value: w.id, label: w.name }))}
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
            showTotal: (total) => `Total ${total} transfers`,
          }}
        />
      </Card>
    </div>
  );
}
