'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Select,
  DatePicker,
  Tag,
  type TableColumnsType,
  type TablePaginationConfig,
} from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import { useBatches } from '@/hooks/use-batches';
import { useWarehouses } from '@/hooks/use-inventory';
import { BatchStatusTag } from '@/components/batch';
import type { Batch, BatchQueryParams, BatchStatus } from '@/lib/batch';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const statusOptions: { value: BatchStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'DEPLETED', label: 'Depleted' },
  { value: 'RECALLED', label: 'Recalled' },
];

export default function BatchListPage() {
  const [filters, setFilters] = useState<BatchQueryParams>({
    page: 1,
    limit: 25,
  });

  const queryParams = useMemo(() => ({ ...filters }), [filters]);

  const { data, isLoading, isFetching } = useBatches(queryParams);
  const { data: warehouses } = useWarehouses();

  const columns: TableColumnsType<Batch> = [
    {
      title: 'Batch #',
      dataIndex: 'batchNumber',
      key: 'batchNumber',
      width: 150,
      render: (num: string, record: Batch) => (
        <Link href={`/inventory/batches/${record.id}`} style={{ fontWeight: 500 }}>
          {num}
        </Link>
      ),
    },
    {
      title: 'Item',
      key: 'item',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{record.item.sku}</span>
          <span style={{ color: '#888', fontSize: 12 }}>{record.item.name}</span>
        </Space>
      ),
    },
    {
      title: 'Warehouse',
      dataIndex: ['warehouse', 'name'],
      key: 'warehouse',
      width: 150,
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (qty: number) => qty.toLocaleString(),
    },
    {
      title: 'Manufacture Date',
      dataIndex: 'manufactureDate',
      key: 'manufactureDate',
      width: 140,
      render: (date: string | null) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Expiry Date',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      width: 140,
      render: (date: string | null) => {
        if (!date) return '-';
        const d = dayjs(date);
        const daysLeft = d.diff(dayjs(), 'day');
        let color = 'green';
        if (daysLeft <= 0) color = 'red';
        else if (daysLeft <= 7) color = 'red';
        else if (daysLeft <= 30) color = 'orange';
        return <Tag color={color}>{d.format('DD/MM/YYYY')}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: BatchStatus) => <BatchStatusTag status={status} />,
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
          Batch Tracking
        </Title>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Select
              placeholder="Warehouse"
              style={{ width: 180 }}
              allowClear
              value={filters.warehouseId}
              onChange={(value) => setFilters((prev) => ({ ...prev, warehouseId: value, page: 1 }))}
              options={(warehouses || []).map((w) => ({
                value: w.id,
                label: w.name,
              }))}
            />
            <Select
              placeholder="Status"
              style={{ width: 140 }}
              allowClear
              value={filters.status}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
              options={statusOptions}
            />
            <RangePicker
              placeholder={['Expiry From', 'Expiry To']}
              onChange={(dates) => {
                setFilters((prev) => ({
                  ...prev,
                  expiryFrom: dates?.[0]?.toISOString(),
                  expiryTo: dates?.[1]?.toISOString(),
                  page: 1,
                }));
              }}
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
            showTotal: (total) => `Total ${total} batches`,
          }}
        />
      </Card>
    </div>
  );
}
