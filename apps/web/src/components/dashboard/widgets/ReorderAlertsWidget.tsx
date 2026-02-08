'use client';

import { Card, List, Tag, Typography, Skeleton, Empty } from 'antd';
import { AlertOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const { Text } = Typography;

interface ReorderAlert {
  id: string;
  itemId: string;
  warehouseId: string;
  currentStock: number;
  reorderLevel: number;
  suggestedQty: number;
  status: string;
  createdAt: string;
  item?: { name: string; sku: string };
  warehouse?: { name: string };
}

export function ReorderAlertsWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['reorder-alerts', 'pending'],
    queryFn: async () => {
      try {
        const response = await api.get('/reorder/alerts', {
          params: { status: 'PENDING', limit: 10 },
        });
        return response.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  const alerts: ReorderAlert[] = data || [];

  return (
    <Card title="Reorder Alerts" style={{ height: '100%' }}>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : alerts.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No reorder alerts"
          style={{ padding: '20px 0' }}
        />
      ) : (
        <List
          size="small"
          dataSource={alerts}
          renderItem={(alert) => (
            <List.Item>
              <List.Item.Meta
                avatar={<AlertOutlined style={{ color: '#faad14', fontSize: 16 }} />}
                title={
                  <span>
                    <Text strong style={{ fontSize: 13 }}>
                      {alert.item?.name || 'Unknown Item'}
                    </Text>{' '}
                    <Tag color="orange" style={{ fontSize: 10 }}>
                      {alert.status}
                    </Tag>
                  </span>
                }
                description={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Stock: {alert.currentStock} | Reorder at: {alert.reorderLevel} | Suggested:{' '}
                    {alert.suggestedQty}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
