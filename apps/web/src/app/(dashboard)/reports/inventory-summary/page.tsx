'use client';

import { useState } from 'react';
import { Breadcrumb, Table, Card, Typography, Empty, Skeleton, Tag, Space } from 'antd';
import { HomeOutlined, BarChartOutlined, WarningOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useInventorySummary } from '@/hooks/use-reports';
import { ReportSummary } from '@/components/reports';
import type { InventorySummaryItem } from '@/lib/reports';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

export default function InventorySummaryPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading } = useInventorySummary({ page, limit: pageSize });

  const handleTableChange = (pagination: any) => {
    setPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const handleRowClick = (record: InventorySummaryItem) => {
    router.push(`/inventory/items/${record.itemId}`);
  };

  const formatCurrency = (value: number) => {
    return `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const columns: ColumnsType<InventorySummaryItem> = [
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
        <Space>
          <Link href={`/inventory/items/${record.itemId}`} onClick={(e) => e.stopPropagation()}>
            {text}
          </Link>
          {record.isLowStock && (
            <Tag icon={<WarningOutlined />} color="warning">
              Low Stock
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'On Hand',
      dataIndex: 'onHand',
      key: 'onHand',
      align: 'right',
      sorter: (a, b) => a.onHand - b.onHand,
      width: 100,
    },
    {
      title: 'Committed',
      dataIndex: 'committed',
      key: 'committed',
      align: 'right',
      sorter: (a, b) => a.committed - b.committed,
      width: 110,
    },
    {
      title: 'Available',
      dataIndex: 'available',
      key: 'available',
      align: 'right',
      sorter: (a, b) => a.available - b.available,
      render: (value, record) => (
        <Text strong={record.isLowStock} type={record.isLowStock ? 'warning' : undefined}>
          {value}
        </Text>
      ),
      width: 100,
    },
    {
      title: 'Reorder Level',
      dataIndex: 'reorderLevel',
      key: 'reorderLevel',
      align: 'right',
      sorter: (a, b) => a.reorderLevel - b.reorderLevel,
      width: 130,
    },
    {
      title: 'Total Value',
      dataIndex: 'totalValue',
      key: 'totalValue',
      align: 'right',
      sorter: (a, b) => a.totalValue - b.totalValue,
      render: (value) => formatCurrency(value),
      width: 150,
    },
  ];

  const summaryItems = data
    ? [
        {
          title: 'Total Items',
          value: data.summary.totalItems,
        },
        {
          title: 'Total Value',
          value: formatCurrency(data.summary.totalValue),
        },
        {
          title: 'Low Stock Items',
          value: data.summary.lowStockCount,
          valueStyle: data.summary.lowStockCount > 0 ? { color: '#faad14' } : undefined,
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
            title: 'Inventory Summary',
          },
        ]}
      />

      <Title level={4} style={{ marginBottom: 16 }}>
        Inventory Summary
      </Title>

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
                scroll={{ x: 1000 }}
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
