'use client';

import { Card, Statistic } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { useDashboardOverview } from '@/hooks/use-dashboard';

export function InventoryWidget() {
  const { data: overview, isLoading } = useDashboardOverview();
  const kpis = overview?.kpis;

  return (
    <Card loading={isLoading} style={{ height: '100%' }} bodyStyle={{ padding: 16 }}>
      <Statistic
        title="Low Stock Items"
        value={kpis?.lowStockItems || 0}
        prefix={<WarningOutlined style={{ color: '#faad14' }} />}
        valueStyle={{ color: kpis?.lowStockItems ? '#faad14' : undefined }}
      />
    </Card>
  );
}
