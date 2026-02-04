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
  DatePicker,
  type TableColumnsType,
  type TablePaginationConfig,
} from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { useAdjustments, useWarehouses } from '@/hooks/use-inventory';
import { InventoryAdjustment, AdjustmentQueryParams } from '@/lib/inventory';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function InventoryAdjustmentsPage() {
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<AdjustmentQueryParams>({
    page: 1,
    limit: 25,
  });

  const queryParams = useMemo(() => ({ ...filters }), [filters]);

  const { data, isLoading, isFetching } = useAdjustments(queryParams);
  const { data: warehouses } = useWarehouses();

  const columns: TableColumnsType<InventoryAdjustment> = [
    {
      title: 'Adjustment #',
      dataIndex: 'adjustmentNumber',
      key: 'adjustmentNumber',
      width: 150,
      render: (num: string, record: InventoryAdjustment) => (
        <Link href={`/inventory/adjustments/${record.id}`} style={{ fontWeight: 500 }}>
          {num}
        </Link>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'adjustmentDate',
      key: 'adjustmentDate',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Warehouse',
      dataIndex: ['warehouse', 'name'],
      key: 'warehouse',
      ellipsis: true,
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
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
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
          Inventory Adjustments
        </Title>
        <Link href="/inventory/adjustments/new">
          <Button type="primary" icon={<PlusOutlined />}>
            New Adjustment
          </Button>
        </Link>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="Search adjustments..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
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
            showTotal: (total) => `Total ${total} adjustments`,
          }}
        />
      </Card>
    </div>
  );
}
