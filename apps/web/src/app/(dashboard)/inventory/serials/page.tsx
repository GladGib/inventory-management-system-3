'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Typography,
  Select,
  type TableColumnsType,
  type TablePaginationConfig,
} from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { useSerials } from '@/hooks/use-serials';
import { useWarehouses } from '@/hooks/use-inventory';
import { SerialStatusTag } from '@/components/serial';
import { WarrantyBadge } from '@/components/serial';
import type { Serial, SerialQueryParams, SerialStatus } from '@/lib/serial';

const { Title, Text } = Typography;

const statusOptions: { value: SerialStatus; label: string }[] = [
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'DEFECTIVE', label: 'Defective' },
  { value: 'IN_REPAIR', label: 'In Repair' },
  { value: 'SCRAPPED', label: 'Scrapped' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
];

export default function SerialListPage() {
  const [filters, setFilters] = useState<SerialQueryParams>({
    page: 1,
    limit: 25,
  });

  const queryParams = useMemo(() => ({ ...filters }), [filters]);

  const { data, isLoading, isFetching } = useSerials(queryParams);
  const { data: warehouses } = useWarehouses();

  const columns: TableColumnsType<Serial> = [
    {
      title: 'Serial #',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
      width: 180,
      render: (num: string, record: Serial) => (
        <Link href={`/inventory/serials/${record.id}`} style={{ fontWeight: 500 }}>
          {num}
        </Link>
      ),
    },
    {
      title: 'Item',
      key: 'item',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.item.sku}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.item.name}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Warehouse',
      key: 'warehouse',
      width: 150,
      render: (_, record) => (record.warehouse ? record.warehouse.name : '-'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: SerialStatus) => <SerialStatusTag status={status} />,
    },
    {
      title: 'Customer',
      key: 'customer',
      width: 160,
      render: (_, record) => (record.soldTo ? record.soldTo.displayName : '-'),
    },
    {
      title: 'Warranty',
      key: 'warranty',
      width: 180,
      render: (_, record) => (
        <WarrantyBadge
          warrantyEndDate={record.warrantyEndDate}
          warrantyMonths={record.warrantyMonths}
        />
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
          Serial Number Tracking
        </Title>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="Search serial numbers..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  search: e.target.value || undefined,
                  page: 1,
                }))
              }
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder="Status"
              style={{ width: 150 }}
              allowClear
              value={filters.status}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
              options={statusOptions}
            />
            <Select
              placeholder="Warehouse"
              style={{ width: 180 }}
              allowClear
              value={filters.warehouseId}
              onChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  warehouseId: value,
                  page: 1,
                }))
              }
              options={(warehouses || []).map((w) => ({
                value: w.id,
                label: w.name,
              }))}
            />
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
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
            showTotal: (total) => `Total ${total} serials`,
          }}
        />
      </Card>
    </div>
  );
}
