'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, Table, Typography, Button, Space, Select, DatePicker } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { useAssemblies } from '@/hooks/use-composite';
import { AssemblyStatusTag } from '@/components/composite/AssemblyStatusTag';
import type { Assembly, AssemblyStatus, AssemblyQueryParams } from '@/lib/composite';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function AssembliesPage() {
  const [filters, setFilters] = useState<AssemblyQueryParams>({ page: 1, limit: 25 });
  const { data: response, isLoading } = useAssemblies(filters);

  const assemblies = response?.data || [];
  const meta = response?.meta;

  const columns: TableColumnsType<Assembly> = [
    {
      title: 'Assembly #',
      dataIndex: 'assemblyNumber',
      key: 'assemblyNumber',
      width: 150,
      render: (num: string, record: Assembly) => (
        <Link href={`/inventory/assemblies/${record.id}`} style={{ fontWeight: 500 }}>
          {num}
        </Link>
      ),
    },
    {
      title: 'Composite Item',
      key: 'compositeItem',
      ellipsis: true,
      render: (_: unknown, record: Assembly) =>
        record.compositeItem?.item
          ? `${record.compositeItem.item.sku} - ${record.compositeItem.item.name}`
          : '-',
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (qty: number) => {
        const num = Number(qty);
        return num < 0 ? `${num} (Disassembly)` : num;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: AssemblyStatus) => <AssemblyStatusTag status={status} />,
    },
    {
      title: 'Date',
      dataIndex: 'assemblyDate',
      key: 'assemblyDate',
      width: 120,
      render: (date: string) => (date ? new Date(date).toLocaleDateString() : '-'),
    },
    {
      title: 'Total Cost',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 130,
      align: 'right',
      render: (cost: number) => (cost != null ? `RM ${Number(cost).toFixed(2)}` : '-'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Assembly) => (
        <Link href={`/inventory/assemblies/${record.id}`}>
          <Button type="link" size="small">
            View
          </Button>
        </Link>
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
          Assembly Orders
        </Title>
        <Link href="/inventory/assemblies/new">
          <Button type="primary" icon={<PlusOutlined />}>
            New Assembly
          </Button>
        </Link>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Select
              placeholder="Status"
              style={{ width: 150 }}
              allowClear
              value={filters.status}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
            <RangePicker
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setFilters((prev) => ({
                    ...prev,
                    fromDate: dates[0]!.toISOString(),
                    toDate: dates[1]!.toISOString(),
                    page: 1,
                  }));
                } else {
                  setFilters((prev) => ({
                    ...prev,
                    fromDate: undefined,
                    toDate: undefined,
                    page: 1,
                  }));
                }
              }}
            />
            <Button onClick={() => setFilters({ page: 1, limit: 25 })}>Reset</Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={assemblies}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: meta?.page || 1,
            pageSize: meta?.limit || 25,
            total: meta?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} records`,
            onChange: (page, pageSize) =>
              setFilters((prev) => ({ ...prev, page, limit: pageSize })),
          }}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
}
