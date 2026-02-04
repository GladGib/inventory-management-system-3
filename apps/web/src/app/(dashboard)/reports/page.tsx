'use client';

import { Card, Row, Col, Typography, Space } from 'antd';
import {
  ShoppingCartOutlined,
  TeamOutlined,
  InboxOutlined,
  DollarOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import Link from 'next/link';

const { Title, Paragraph } = Typography;

interface ReportCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  color: string;
}

const salesReports: ReportCard[] = [
  {
    icon: <TeamOutlined />,
    title: 'Sales by Customer',
    description: 'View sales performance by customer with order counts and revenue totals.',
    href: '/reports/sales-by-customer',
    color: '#1890ff',
  },
  {
    icon: <AppstoreOutlined />,
    title: 'Sales by Item',
    description: 'Analyze top-selling items with quantity sold and average pricing.',
    href: '/reports/sales-by-item',
    color: '#52c41a',
  },
  {
    icon: <ClockCircleOutlined />,
    title: 'Receivables Aging',
    description: 'Track outstanding customer invoices by aging bucket.',
    href: '/reports/receivables-aging',
    color: '#faad14',
  },
];

const inventoryReports: ReportCard[] = [
  {
    icon: <InboxOutlined />,
    title: 'Inventory Summary',
    description: 'Overview of on-hand, committed, and available inventory levels.',
    href: '/reports/inventory-summary',
    color: '#722ed1',
  },
  {
    icon: <DollarOutlined />,
    title: 'Inventory Valuation',
    description: 'Calculate total inventory value at cost price by warehouse.',
    href: '/reports/inventory-valuation',
    color: '#eb2f96',
  },
  {
    icon: <ClockCircleOutlined />,
    title: 'Stock Aging',
    description: 'Identify slow-moving inventory and aging stock for better management.',
    href: '/reports/stock-aging',
    color: '#fa8c16',
  },
];

const purchaseReports: ReportCard[] = [
  {
    icon: <ClockCircleOutlined />,
    title: 'Payables Aging',
    description: 'Track outstanding vendor bills by aging bucket.',
    href: '/reports/payables-aging',
    color: '#fa8c16',
  },
];

interface ReportSectionProps {
  title: string;
  icon: React.ReactNode;
  reports: ReportCard[];
}

function ReportSection({ title, icon, reports }: ReportSectionProps) {
  return (
    <div style={{ marginBottom: 32 }}>
      <Space style={{ marginBottom: 16 }}>
        {icon}
        <Title level={5} style={{ margin: 0 }}>
          {title}
        </Title>
      </Space>
      <Row gutter={[16, 16]}>
        {reports.map((report) => (
          <Col xs={24} sm={12} lg={8} key={report.href}>
            <Link href={report.href} style={{ textDecoration: 'none' }}>
              <Card
                hoverable
                style={{ height: '100%' }}
                styles={{
                  body: { display: 'flex', flexDirection: 'column', height: '100%' },
                }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div
                    style={{
                      fontSize: 32,
                      color: report.color,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {report.icon}
                  </div>
                  <div>
                    <Title level={5} style={{ marginBottom: 8 }}>
                      {report.title}
                    </Title>
                    <Paragraph
                      type="secondary"
                      style={{ marginBottom: 0, fontSize: 14 }}
                      ellipsis={{ rows: 2 }}
                    >
                      {report.description}
                    </Paragraph>
                  </div>
                </Space>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Reports
      </Title>

      <ReportSection
        title="Sales Reports"
        icon={<ShoppingCartOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
        reports={salesReports}
      />

      <ReportSection
        title="Inventory Reports"
        icon={<InboxOutlined style={{ fontSize: 20, color: '#722ed1' }} />}
        reports={inventoryReports}
      />

      <ReportSection
        title="Purchase Reports"
        icon={<FileTextOutlined style={{ fontSize: 20, color: '#fa8c16' }} />}
        reports={purchaseReports}
      />
    </div>
  );
}
