'use client';

import { Card, Statistic } from 'antd';
import { FallOutlined } from '@ant-design/icons';
import { useDashboardOverview } from '@/hooks/use-dashboard';

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `RM ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `RM ${(value / 1000).toFixed(1)}K`;
  return `RM ${value.toFixed(2)}`;
};

export function PayablesWidget() {
  const { data: overview, isLoading } = useDashboardOverview();
  const kpis = overview?.kpis;

  return (
    <Card loading={isLoading} style={{ height: '100%' }} bodyStyle={{ padding: 16 }}>
      <Statistic
        title="Outstanding Payables"
        value={kpis?.payables?.total || 0}
        prefix={<FallOutlined style={{ color: '#ff4d4f' }} />}
        formatter={(value) => formatCurrency(Number(value))}
        valueStyle={{ color: kpis?.payables?.total ? '#ff4d4f' : undefined }}
        suffix={<span style={{ fontSize: 11, color: '#999' }}>({kpis?.payables?.count || 0})</span>}
      />
    </Card>
  );
}
