'use client';

import { useRouter } from 'next/navigation';
import { Card, Typography, Button, Space, Table, Row, Col, Statistic, Spin, Tag } from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  AlertOutlined,
  ShoppingCartOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { useReorderReport } from '@/hooks/use-reorder';
import { StockCoverageBar } from '@/components/reorder/StockCoverageBar';
import type { ReorderSuggestion } from '@/lib/reorder';

const { Title, Text } = Typography;

export default function ReorderReportPage() {
  const router = useRouter();
  const { data: report, isLoading } = useReorderReport();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  // Items below reorder columns
  const belowReorderColumns: TableColumnsType<ReorderSuggestion> = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 120,
      render: (sku: string) => <Text strong>{sku}</Text>,
    },
    {
      title: 'Item Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Current Stock',
      dataIndex: 'currentStock',
      key: 'currentStock',
      width: 120,
      align: 'right',
    },
    {
      title: 'Reorder Level',
      dataIndex: 'reorderLevel',
      key: 'reorderLevel',
      width: 120,
      align: 'right',
    },
    {
      title: 'Suggested Qty',
      dataIndex: 'suggestedQty',
      key: 'suggestedQty',
      width: 120,
      align: 'right',
      render: (qty: number) => <Text strong>{qty}</Text>,
    },
    {
      title: 'Est. Cost',
      dataIndex: 'estimatedCost',
      key: 'estimatedCost',
      width: 120,
      align: 'right',
      render: (cost: number) => `RM ${(cost || 0).toFixed(2)}`,
    },
  ];

  // Stock coverage columns
  const coverageColumns: TableColumnsType<{
    itemId: string;
    sku: string;
    name: string;
    currentStock: number;
    reorderLevel: number;
    avgDailyDemand: number;
    coverageDays: number;
  }> = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 120,
      render: (sku: string) => <Text strong>{sku}</Text>,
    },
    {
      title: 'Item Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Stock Level',
      key: 'stockLevel',
      width: 150,
      render: (_: unknown, record) => (
        <StockCoverageBar currentStock={record.currentStock} reorderLevel={record.reorderLevel} />
      ),
    },
    {
      title: 'Avg Daily Demand',
      dataIndex: 'avgDailyDemand',
      key: 'avgDailyDemand',
      width: 140,
      align: 'right',
    },
    {
      title: 'Coverage Days',
      dataIndex: 'coverageDays',
      key: 'coverageDays',
      width: 130,
      align: 'right',
      render: (days: number) => {
        let color = 'green';
        if (days <= 7) color = 'red';
        else if (days <= 14) color = 'orange';
        else if (days <= 30) color = 'blue';

        return <Tag color={color}>{days >= 999 ? 'No demand' : `${days} days`}</Tag>;
      },
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/reports')}>
            Back
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            Reorder Report
          </Title>
        </Space>
        <Button icon={<DownloadOutlined />}>Export</Button>
      </div>

      {/* Summary KPIs */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Below Reorder"
              value={report?.summary?.itemsBelowReorder || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{
                color: (report?.summary?.itemsBelowReorder || 0) > 0 ? '#cf1322' : '#3f8600',
              }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Pending Alerts"
              value={report?.summary?.pendingAlerts || 0}
              prefix={<AlertOutlined />}
              valueStyle={{
                color: (report?.summary?.pendingAlerts || 0) > 0 ? '#faad14' : '#3f8600',
              }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="POs Created"
              value={report?.summary?.poCreatedAlerts || 0}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Auto-Reorder Active"
              value={report?.summary?.autoReorderActive || 0}
              prefix={<SyncOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Items Below Reorder */}
      <Card title="Items Below Reorder Point" style={{ marginBottom: 24 }}>
        <Table
          columns={belowReorderColumns}
          dataSource={report?.itemsBelowReorder || []}
          rowKey="itemId"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
          size="small"
        />
      </Card>

      {/* Stock Coverage */}
      <Card title="Stock Coverage Days">
        <Table
          columns={coverageColumns}
          dataSource={report?.stockCoverage || []}
          rowKey="itemId"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
          size="small"
        />
      </Card>
    </div>
  );
}
