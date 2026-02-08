'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Typography,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  StarFilled,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { usePriceLists, useDeletePriceList } from '@/hooks/use-price-lists';
import type { PriceList, PriceListType } from '@/lib/price-lists';

const { Title } = Typography;

export default function PriceListsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<PriceListType | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading } = usePriceLists({
    search: search || undefined,
    type: typeFilter,
    page,
    limit: pageSize,
  });
  const deleteMutation = useDeletePriceList();

  const columns: ColumnsType<PriceList> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space>
          <a onClick={() => router.push(`/settings/price-lists/${record.id}`)}>{name}</a>
          {record.isDefault && (
            <Tooltip title="Default price list">
              <StarFilled style={{ color: '#faad14' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: PriceListType) => (
        <Tag color={type === 'SALES' ? 'blue' : 'green'}>{type}</Tag>
      ),
    },
    {
      title: 'Markup',
      key: 'markup',
      width: 120,
      render: (_: unknown, record) => {
        if (record.markupValue === 0) return '-';
        return record.markupType === 'PERCENTAGE'
          ? `${record.markupValue}%`
          : `RM ${record.markupValue.toFixed(2)}`;
      },
    },
    {
      title: 'Items',
      dataIndex: 'itemsCount',
      key: 'itemsCount',
      width: 80,
      align: 'center',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'Effective Dates',
      key: 'effectiveDates',
      width: 200,
      render: (_: unknown, record) => {
        if (!record.effectiveFrom && !record.effectiveTo) return 'Always';
        const from = record.effectiveFrom
          ? new Date(record.effectiveFrom).toLocaleDateString('en-MY')
          : 'Start';
        const to = record.effectiveTo
          ? new Date(record.effectiveTo).toLocaleDateString('en-MY')
          : 'Ongoing';
        return `${from} - ${to}`;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => router.push(`/settings/price-lists/${record.id}`)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this price list?"
            description="This will deactivate the price list."
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

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
          Price Lists
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => router.push('/settings/price-lists/new')}
        >
          New Price List
        </Button>
      </div>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search price lists..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder="Filter by type"
            style={{ width: 150 }}
            allowClear
            value={typeFilter}
            onChange={(value) => {
              setTypeFilter(value);
              setPage(1);
            }}
            options={[
              { label: 'Sales', value: 'SALES' },
              { label: 'Purchase', value: 'PURCHASE' },
            ]}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total: data?.meta?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} price lists`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>
    </div>
  );
}
