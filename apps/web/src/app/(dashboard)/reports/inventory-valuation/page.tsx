'use client';

import { useState } from 'react';
import { Breadcrumb, Table, Card, Typography, Empty, Skeleton, Select, Space } from 'antd';
import { HomeOutlined, BarChartOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useInventoryValuation } from '@/hooks/use-reports';
import { ReportSummary } from '@/components/reports';
import type { InventoryValuationItem } from '@/lib/reports';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Option } = Select;

export default function InventoryValuationPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [warehouseId, setWarehouseId] = useState<string | undefined>(undefined);

  const { data, isLoading } = useInventoryValuation(warehouseId, { page, limit: pageSize });

  const handleTableChange = (pagination: any) => {
    setPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const handleWarehouseChange = (value: string | undefined) => {
    setWarehouseId(value);
    setPage(1); // Reset to first page on filter change
  };

  const handleRowClick = (record: InventoryValuationItem) => {
    router.push(`/inventory/items/${record.itemId}`);
  };

  const formatCurrency = (value: number) => {
    return `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const columns: ColumnsType<InventoryValuationItem> = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      sorter: (a, b) => a.sku.localeCompare(b.sku),
      width: 120,
    },
    {
      title: 'Item Name',
      dataIndex: 'itemName',
      key: 'itemName',
      sorter: (a, b) => a.itemName.localeCompare(b.itemName),
      render: (text, record) => (
        <Link href={`/inventory/items/${record.itemId}`} onClick={(e) => e.stopPropagation()}>
          {text}
        </Link>
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
      sorter: (a, b) => a.quantity - b.quantity,
      width: 120,
    },
    {
      title: 'Cost Price',
      dataIndex: 'costPrice',
      key: 'costPrice',
      align: 'right',
      sorter: (a, b) => a.costPrice - b.costPrice,
      render: (value) => formatCurrency(value),
      width: 150,
    },
    {
      title: 'Total Value',
      dataIndex: 'totalValue',
      key: 'totalValue',
      align: 'right',
      sorter: (a, b) => a.totalValue - b.totalValue,
      render: (value) => <Text strong>{formatCurrency(value)}</Text>,
      width: 180,
    },
  ];

  const summaryItems = data
    ? [
        {
          title: 'Total Items',
          value: data.summary.totalItems,
        },
        {
          title: 'Total Quantity',
          value: data.summary.totalQuantity.toLocaleString('en-MY'),
        },
        {
          title: 'Total Valuation',
          value: formatCurrency(data.summary.totalValue),
          valueStyle: { fontWeight: 600 },
        },
      ]
    : [];

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          {
            href: '/',
            title: <HomeOutlined />,
          },
          {
            href: '/reports',
            title: (
              <>
                <BarChartOutlined />
                <span>Reports</span>
              </>
            ),
          },
          {
            title: 'Inventory Valuation',
          },
        ]}
      />

      <Title level={4} style={{ marginBottom: 16 }}>
        Inventory Valuation
      </Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space align="center">
          <Text strong>Warehouse:</Text>
          <Select
            style={{ width: 200 }}
            placeholder="All Warehouses"
            allowClear
            value={warehouseId}
            onChange={handleWarehouseChange}
            disabled={isLoading}
          >
            <Option value={undefined}>All Warehouses</Option>
            {/* Warehouse options would be fetched from an API in production */}
          </Select>
        </Space>
      </Card>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        <>
          <ReportSummary items={summaryItems} />

          <Card>
            {data?.data.length === 0 ? (
              <Empty description="No inventory items found" />
            ) : (
              <Table
                columns={columns}
                dataSource={data?.data}
                rowKey="itemId"
                loading={isLoading}
                pagination={{
                  current: page,
                  pageSize: pageSize,
                  total: data?.meta.total || 0,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} items`,
                  pageSizeOptions: ['10', '20', '50', '100'],
                }}
                onChange={handleTableChange}
                onRow={(record) => ({
                  onClick: () => handleRowClick(record),
                  style: { cursor: 'pointer' },
                })}
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
