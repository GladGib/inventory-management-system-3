'use client';

import { Card, Row, Col, Statistic, Typography } from 'antd';
import {
  DollarOutlined,
  WarningOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import { useDashboardOverview } from '@/hooks/use-dashboard';
import {
  SalesTrendChart,
  TopItemsChart,
  TopCustomersChart,
  PendingActionsCard,
  RecentActivityCard,
} from '@/components/dashboard';

const { Title } = Typography;

// Format currency for display
const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `RM ${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `RM ${(value / 1000).toFixed(1)}K`;
  }
  return `RM ${value.toFixed(2)}`;
};

export default function DashboardPage() {
  const { data: overview, isLoading } = useDashboardOverview();
  const kpis = overview?.kpis;

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Dashboard
      </Title>

      {/* Sales & Revenue Stats */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Month Sales"
              value={kpis?.monthSales?.total || 0}
              prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
              formatter={(value) => formatCurrency(Number(value))}
              suffix={
                <span style={{ fontSize: 12, color: '#999' }}>
                  ({kpis?.monthSales?.count || 0} invoices)
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Year-to-Date Sales"
              value={kpis?.ytdSales || 0}
              prefix={<DollarOutlined style={{ color: '#1890ff' }} />}
              formatter={(value) => formatCurrency(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Low Stock Items"
              value={kpis?.lowStockItems || 0}
              prefix={<WarningOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: kpis?.lowStockItems ? '#faad14' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Pending Orders"
              value={kpis?.pendingOrders || 0}
              prefix={<ShoppingCartOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Receivables & Payables */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Outstanding Receivables"
              value={kpis?.receivables?.total || 0}
              prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ color: kpis?.receivables?.total ? '#52c41a' : undefined }}
              suffix={
                <span style={{ fontSize: 12, color: '#999' }}>
                  ({kpis?.receivables?.count || 0})
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Outstanding Payables"
              value={kpis?.payables?.total || 0}
              prefix={<FallOutlined style={{ color: '#ff4d4f' }} />}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ color: kpis?.payables?.total ? '#ff4d4f' : undefined }}
              suffix={
                <span style={{ fontSize: 12, color: '#999' }}>({kpis?.payables?.count || 0})</span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={12}>
          <Card loading={isLoading}>
            <Row gutter={24}>
              <Col span={12}>
                <Statistic
                  title="Net Position"
                  value={(kpis?.receivables?.total || 0) - (kpis?.payables?.total || 0)}
                  formatter={(value) => formatCurrency(Number(value))}
                  valueStyle={{
                    color:
                      (kpis?.receivables?.total || 0) >= (kpis?.payables?.total || 0)
                        ? '#52c41a'
                        : '#ff4d4f',
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
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <SalesTrendChart defaultPeriod={12} />
        </Col>
        <Col xs={24} lg={12}>
          <TopItemsChart limit={10} />
        </Col>
      </Row>

      {/* More Charts Row */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <TopCustomersChart limit={10} />
        </Col>
        <Col xs={24} lg={12}>
          <PendingActionsCard />
        </Col>
      </Row>

      {/* Recent Activity Row */}
      <Row gutter={[24, 24]}>
        <Col xs={24}>
          <RecentActivityCard />
        </Col>
      </Row>
    </div>
  );
}
