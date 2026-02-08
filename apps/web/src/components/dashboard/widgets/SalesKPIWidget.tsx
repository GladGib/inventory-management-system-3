'use client';

import { Card, Statistic, Row, Col } from 'antd';
import { RiseOutlined, DollarOutlined } from '@ant-design/icons';
import { useDashboardOverview } from '@/hooks/use-dashboard';

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `RM ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `RM ${(value / 1000).toFixed(1)}K`;
  return `RM ${value.toFixed(2)}`;
};

export function SalesKPIWidget() {
  const { data: overview, isLoading } = useDashboardOverview();
  const kpis = overview?.kpis;

  return (
    <Card loading={isLoading} style={{ height: '100%' }} bodyStyle={{ padding: 16 }}>
      <Row gutter={16}>
        <Col span={12}>
          <Statistic
            title="Month Sales"
            value={kpis?.monthSales?.total || 0}
            prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
            formatter={(value) => formatCurrency(Number(value))}
            suffix={
              <span style={{ fontSize: 11, color: '#999' }}>({kpis?.monthSales?.count || 0})</span>
            }
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Year-to-Date Sales"
            value={kpis?.ytdSales || 0}
            prefix={<DollarOutlined style={{ color: '#1890ff' }} />}
            formatter={(value) => formatCurrency(Number(value))}
          />
        </Col>
      </Row>
    </Card>
  );
}
