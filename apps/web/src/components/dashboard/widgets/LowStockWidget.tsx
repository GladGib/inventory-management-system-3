'use client';

import { Card, Table, Tag, Typography, Skeleton, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useDashboardAlerts } from '@/hooks/use-dashboard';
import Link from 'next/link';

const { Text } = Typography;

interface LowStockItem {
  id: string;
  sku: string;
  name: string;
  currentStock: number;
  reorderLevel: number;
  deficit: number;
}

export function LowStockWidget() {
  const { data: alerts, isLoading } = useDashboardAlerts();
  const items = alerts?.lowStock?.items || [];

  const columns: ColumnsType<LowStockItem> = [
    {
      title: 'Item',
      key: 'item',
      render: (_, record) => (
        <Link href={`/items/${record.id}`} style={{ color: 'inherit' }}>
          <div>
            <Text strong style={{ fontSize: 13 }}>
              {record.name}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.sku}
            </Text>
          </div>
        </Link>
      ),
    },
    {
      title: 'Stock',
      dataIndex: 'currentStock',
      key: 'currentStock',
      width: 80,
      align: 'center',
      render: (stock: number) => <Tag color={stock === 0 ? 'red' : 'orange'}>{stock}</Tag>,
    },
    {
      title: 'Reorder At',
      dataIndex: 'reorderLevel',
      key: 'reorderLevel',
      width: 90,
      align: 'center',
    },
    {
      title: 'Deficit',
      dataIndex: 'deficit',
      key: 'deficit',
      width: 80,
      align: 'center',
      render: (deficit: number) => <Text type="danger">{deficit}</Text>,
    },
  ];

  return (
    <Card title="Low Stock Items" style={{ height: '100%' }}>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No low stock items"
          style={{ padding: '20px 0' }}
        />
      ) : (
        <Table columns={columns} dataSource={items} rowKey="id" size="small" pagination={false} />
      )}
    </Card>
  );
}
