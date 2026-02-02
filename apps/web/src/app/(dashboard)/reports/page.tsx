'use client';

import { Card, Row, Col, Typography, List, Space } from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  FileTextOutlined,
  DollarOutlined,
  ShoppingOutlined,
  TeamOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import Link from 'next/link';

const { Title, Text } = Typography;

interface ReportCategory {
  title: string;
  icon: React.ReactNode;
  reports: {
    name: string;
    description: string;
    href: string;
  }[];
}

const reportCategories: ReportCategory[] = [
  {
    title: 'Inventory Reports',
    icon: <InboxOutlined style={{ fontSize: 24, color: '#1890ff' }} />,
    reports: [
      {
        name: 'Inventory Summary',
        description: 'Overall inventory levels and values',
        href: '/reports/inventory-summary',
      },
      {
        name: 'Stock Aging',
        description: 'Age analysis of inventory items',
        href: '/reports/stock-aging',
      },
      {
        name: 'Low Stock Alert',
        description: 'Items below reorder level',
        href: '/reports/low-stock',
      },
      {
        name: 'Inventory Valuation',
        description: 'Total value of stock on hand',
        href: '/reports/inventory-valuation',
      },
    ],
  },
  {
    title: 'Sales Reports',
    icon: <ShoppingOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
    reports: [
      {
        name: 'Sales by Customer',
        description: 'Sales breakdown by customer',
        href: '/reports/sales-by-customer',
      },
      {
        name: 'Sales by Item',
        description: 'Top selling items analysis',
        href: '/reports/sales-by-item',
      },
      {
        name: 'Sales Order Status',
        description: 'Status of all sales orders',
        href: '/reports/sales-order-status',
      },
      {
        name: 'Invoice Aging',
        description: 'Outstanding invoices by age',
        href: '/reports/invoice-aging',
      },
    ],
  },
  {
    title: 'Purchase Reports',
    icon: <FileTextOutlined style={{ fontSize: 24, color: '#722ed1' }} />,
    reports: [
      {
        name: 'Purchase by Vendor',
        description: 'Purchase breakdown by vendor',
        href: '/reports/purchase-by-vendor',
      },
      {
        name: 'Purchase by Item',
        description: 'Most purchased items',
        href: '/reports/purchase-by-item',
      },
      {
        name: 'Purchase Order Status',
        description: 'Status of all purchase orders',
        href: '/reports/po-status',
      },
      { name: 'Bill Aging', description: 'Outstanding bills by age', href: '/reports/bill-aging' },
    ],
  },
  {
    title: 'Financial Reports',
    icon: <DollarOutlined style={{ fontSize: 24, color: '#faad14' }} />,
    reports: [
      {
        name: 'Accounts Receivable',
        description: 'Money owed by customers',
        href: '/reports/accounts-receivable',
      },
      {
        name: 'Accounts Payable',
        description: 'Money owed to vendors',
        href: '/reports/accounts-payable',
      },
      {
        name: 'Profit & Loss',
        description: 'Revenue, costs, and profit',
        href: '/reports/profit-loss',
      },
      {
        name: 'Cash Flow',
        description: 'Money coming in and going out',
        href: '/reports/cash-flow',
      },
    ],
  },
];

export default function ReportsPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Reports
      </Title>

      <Row gutter={[24, 24]}>
        {reportCategories.map((category) => (
          <Col xs={24} lg={12} key={category.title}>
            <Card
              title={
                <Space>
                  {category.icon}
                  <span>{category.title}</span>
                </Space>
              }
            >
              <List
                dataSource={category.reports}
                renderItem={(report) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Link href={report.href}>{report.name}</Link>}
                      description={report.description}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
