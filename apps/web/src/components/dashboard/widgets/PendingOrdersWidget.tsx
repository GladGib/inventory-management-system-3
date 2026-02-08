'use client';

import { Card, Statistic } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import { useDashboardOverview } from '@/hooks/use-dashboard';

export function PendingOrdersWidget() {
  const { data: overview, isLoading } = useDashboardOverview();
  const kpis = overview?.kpis;

  return (
    <Card loading={isLoading} style={{ height: '100%' }} bodyStyle={{ padding: 16 }}>
      <Statistic
        title="Pending Orders"
        value={kpis?.pendingOrders || 0}
        prefix={<ShoppingCartOutlined style={{ color: '#1890ff' }} />}
      />
    </Card>
  );
}
