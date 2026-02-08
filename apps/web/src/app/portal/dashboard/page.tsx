'use client';

import { useRouter } from 'next/navigation';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Typography,
  Spin,
  Button,
  Space,
  Alert,
} from 'antd';
import {
  ShoppingCartOutlined,
  FileTextOutlined,
  DollarOutlined,
  WarningOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { portalCustomerService, DashboardSummary } from '@/lib/portal-api';

const { Title, Text } = Typography;

const orderStatusColors: Record<string, string> = {
  DRAFT: 'default',
  CONFIRMED: 'processing',
  PACKED: 'cyan',
  SHIPPED: 'blue',
  DELIVERED: 'green',
  CLOSED: 'default',
  CANCELLED: 'red',
};

const invoiceStatusColors: Record<string, string> = {
  DRAFT: 'default',
  SENT: 'processing',
  PARTIALLY_PAID: 'orange',
  PAID: 'green',
  OVERDUE: 'red',
  VOID: 'default',
};

export default function PortalDashboardPage() {
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['portal', 'dashboard'],
    queryFn: () => portalCustomerService.getDashboard(),
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        message="Failed to load dashboard"
        description="Please try refreshing the page."
        showIcon
      />
    );
  }

  const dashboard = data as DashboardSummary;

  const orderColumns = [
    {
      title: 'Order #',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text: string, record: any) => (
        <a onClick={() => router.push(`/portal/orders/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={orderStatusColors[status] || 'default'}>{status.replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      align: 'right' as const,
      render: (total: number) =>
        `RM ${Number(total).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`,
    },
  ];

  const invoiceColumns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (text: string, record: any) => (
        <a onClick={() => router.push(`/portal/invoices/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => {
        const d = new Date(date);
        const isOverdue = d < new Date();
        return (
          <Text type={isOverdue ? 'danger' : undefined}>
            {d.toLocaleDateString()}
            {isOverdue && ' (Overdue)'}
          </Text>
        );
      },
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right' as const,
      render: (balance: number) =>
        `RM ${Number(balance).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`,
    },
  ];

  const paymentColumns = [
    {
      title: 'Payment #',
      dataIndex: 'paymentNumber',
      key: 'paymentNumber',
    },
    {
      title: 'Date',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method: string) => method.replace(/_/g, ' '),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (amount: number) =>
        `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`,
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Dashboard
      </Title>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Outstanding"
              value={dashboard.summary.totalOutstanding}
              precision={2}
              prefix="RM"
              valueStyle={{ color: dashboard.summary.totalOutstanding > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Overdue Amount"
              value={dashboard.summary.totalOverdue}
              precision={2}
              prefix="RM"
              suffix={
                dashboard.summary.overdueCount > 0 ? (
                  <Tag color="red" style={{ marginLeft: 8 }}>
                    {dashboard.summary.overdueCount} invoices
                  </Tag>
                ) : undefined
              }
              valueStyle={{ color: dashboard.summary.totalOverdue > 0 ? '#cf1322' : '#8c8c8c' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Orders"
              value={dashboard.summary.orderCount}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Payments"
              value={dashboard.summary.paymentCount}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Overdue Warning */}
      {dashboard.summary.overdueCount > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={`You have ${dashboard.summary.overdueCount} overdue invoice(s) totalling RM ${dashboard.summary.totalOverdue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`}
          action={
            <Button
              size="small"
              type="link"
              onClick={() => router.push('/portal/invoices')}
            >
              View Invoices
            </Button>
          }
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Tables */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title="Recent Orders"
            extra={
              <Button
                type="link"
                size="small"
                onClick={() => router.push('/portal/orders')}
              >
                View All <ArrowRightOutlined />
              </Button>
            }
          >
            <Table
              columns={orderColumns}
              dataSource={dashboard.recentOrders}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Outstanding Invoices"
            extra={
              <Button
                type="link"
                size="small"
                onClick={() => router.push('/portal/invoices')}
              >
                View All <ArrowRightOutlined />
              </Button>
            }
          >
            <Table
              columns={invoiceColumns}
              dataSource={dashboard.outstandingInvoices}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        <Col xs={24}>
          <Card
            title="Recent Payments"
            extra={
              <Button
                type="link"
                size="small"
                onClick={() => router.push('/portal/payments')}
              >
                View All <ArrowRightOutlined />
              </Button>
            }
          >
            <Table
              columns={paymentColumns}
              dataSource={dashboard.recentPayments}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
