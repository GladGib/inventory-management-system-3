'use client';

import { Card, Row, Col, Statistic, Typography, Table, List, Tag, Space, Button } from 'antd';
import {
  ShoppingOutlined,
  TeamOutlined,
  DollarOutlined,
  WarningOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const { Title, Text } = Typography;

interface DashboardStats {
  organization: {
    id: string;
    name: string;
  };
  inventory: {
    totalItems: number;
    lowStockItems: number;
  };
  contacts: {
    totalCustomers: number;
    totalVendors: number;
  };
  sales: {
    pendingSalesOrders: number;
    unpaidInvoices: number;
  };
  purchases: {
    pendingPurchaseOrders: number;
    unpaidBills: number;
  };
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get<DashboardStats>('/organizations/current/dashboard');
      return response.data;
    },
  });

  const recentActivities = [
    { id: 1, action: 'Invoice #INV-001 created', time: '5 minutes ago', type: 'invoice' },
    { id: 2, action: 'Sales Order #SO-012 confirmed', time: '1 hour ago', type: 'sales' },
    { id: 3, action: 'Stock adjustment completed', time: '2 hours ago', type: 'inventory' },
    { id: 4, action: 'New customer added: ABC Sdn Bhd', time: '3 hours ago', type: 'customer' },
    { id: 5, action: 'Purchase Order #PO-008 issued', time: '5 hours ago', type: 'purchase' },
  ];

  const pendingTasks = [
    { id: 1, task: '5 invoices awaiting payment', status: 'warning' },
    { id: 2, task: '3 sales orders ready to ship', status: 'info' },
    { id: 3, task: '8 items below reorder level', status: 'error' },
    { id: 4, task: '2 purchase orders pending approval', status: 'warning' },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Dashboard
      </Title>

      {/* Stats Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Items"
              value={stats?.inventory.totalItems || 0}
              prefix={<ShoppingOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Low Stock Items"
              value={stats?.inventory.lowStockItems || 0}
              prefix={<WarningOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: stats?.inventory.lowStockItems ? '#faad14' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Customers"
              value={stats?.contacts.totalCustomers || 0}
              prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Vendors"
              value={stats?.contacts.totalVendors || 0}
              prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Orders & Invoices */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Sales Orders"
              value={stats?.sales.pendingSalesOrders || 0}
              prefix={<ShoppingCartOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Unpaid Invoices"
              value={stats?.sales.unpaidInvoices || 0}
              prefix={<FileTextOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: stats?.sales.unpaidInvoices ? '#ff4d4f' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Purchase Orders"
              value={stats?.purchases.pendingPurchaseOrders || 0}
              prefix={<FileTextOutlined style={{ color: '#13c2c2' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Unpaid Bills"
              value={stats?.purchases.unpaidBills || 0}
              prefix={<DollarOutlined style={{ color: '#eb2f96' }} />}
              valueStyle={{ color: stats?.purchases.unpaidBills ? '#eb2f96' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Activity & Tasks */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="Recent Activity" extra={<Button type="link">View All</Button>}>
            <List
              dataSource={recentActivities}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta title={item.action} description={item.time} />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Action Required" extra={<Button type="link">View All</Button>}>
            <List
              dataSource={pendingTasks}
              renderItem={(item) => (
                <List.Item>
                  <Space>
                    <Tag
                      color={
                        item.status === 'error'
                          ? 'red'
                          : item.status === 'warning'
                            ? 'orange'
                            : 'blue'
                      }
                    >
                      {item.status.toUpperCase()}
                    </Tag>
                    <Text>{item.task}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
