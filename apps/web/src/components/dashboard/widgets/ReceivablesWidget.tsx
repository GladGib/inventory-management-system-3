'use client';

import { Card, Statistic } from 'antd';
import { RiseOutlined } from '@ant-design/icons';
import { useDashboardOverview } from '@/hooks/use-dashboard';

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `RM ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `RM ${(value / 1000).toFixed(1)}K`;
  return `RM ${value.toFixed(2)}`;
};

export function ReceivablesWidget() {
  const { data: overview, isLoading } = useDashboardOverview();
  const kpis = overview?.kpis;

  return (
    <Card loading={isLoading} style={{ height: '100%' }} bodyStyle={{ padding: 16 }}>
      <Statistic
        title="Outstanding Receivables"
        value={kpis?.receivables?.total || 0}
        prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
        formatter={(value) => formatCurrency(Number(value))}
        valueStyle={{ color: kpis?.receivables?.total ? '#52c41a' : undefined }}
        suffix={
          <span style={{ fontSize: 11, color: '#999' }}>({kpis?.receivables?.count || 0})</span>
        }
      />
    </Card>
  );
}
