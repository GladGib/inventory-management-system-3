'use client';

import { Card, Statistic, Row, Col } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useDashboardOverview } from '@/hooks/use-dashboard';

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `RM ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `RM ${(value / 1000).toFixed(1)}K`;
  return `RM ${value.toFixed(2)}`;
};

export function CashFlowWidget() {
  const { data: overview, isLoading } = useDashboardOverview();
  const kpis = overview?.kpis;

  const netPosition = (kpis?.receivables?.total || 0) - (kpis?.payables?.total || 0);

  return (
    <Card loading={isLoading} style={{ height: '100%' }} bodyStyle={{ padding: 16 }}>
      <Row gutter={24}>
        <Col span={12}>
          <Statistic
            title="Net Position"
            value={netPosition}
            formatter={(value) => formatCurrency(Number(value))}
            valueStyle={{
              color: netPosition >= 0 ? '#52c41a' : '#ff4d4f',
            }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Invoices vs Bills"
            value={`${kpis?.receivables?.count || 0} / ${kpis?.payables?.count || 0}`}
            prefix={<FileTextOutlined style={{ color: '#722ed1' }} />}
          />
        </Col>
      </Row>
    </Card>
  );
}
