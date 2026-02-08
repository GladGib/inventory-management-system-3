'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import {
  Card,
  Row,
  Col,
  Typography,
  Table,
  Tag,
  Statistic,
  Space,
  Button,
  Spin,
  Empty,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  ShoppingCartOutlined,
  FileTextOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useVendorDashboard } from '@/hooks/use-vendor-portal';
import type { PurchaseOrder, Bill, VendorPayment } from '@/lib/purchases';

const { Title, Text } = Typography;

const poStatusColors: Record<string, string> = {
  DRAFT: 'default',
  ISSUED: 'blue',
  PARTIALLY_RECEIVED: 'orange',
  RECEIVED: 'green',
  CLOSED: 'default',
  CANCELLED: 'red',
};

const billStatusColors: Record<string, string> = {
  DRAFT: 'default',
  RECEIVED: 'blue',
  PARTIALLY_PAID: 'orange',
  PAID: 'green',
  OVERDUE: 'red',
  VOID: 'default',
};

export default function VendorPortalDashboard() {
  const { data, isLoading } = useVendorDashboard();

  const pendingPOColumns: TableColumnsType<PurchaseOrder> = useMemo(
    () => [
      {
        title: 'PO #',
        dataIndex: 'orderNumber',
        key: 'orderNumber',
        width: 130,
        render: (num: string, record: PurchaseOrder) => (
          <Link
            href={`/portal/vendor/purchase-orders/${record.id}`}
            style={{ fontWeight: 500 }}
          >
            {num}
          </Link>
        ),
      },
      {
        title: 'Date',
        dataIndex: 'orderDate',
        key: 'orderDate',
        width: 110,
        render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
      },
      {
        title: 'Expected',
        dataIndex: 'expectedDate',
        key: 'expectedDate',
        width: 110,
        render: (date: string | null) =>
          date ? dayjs(date).format('DD/MM/YYYY') : '-',
      },
      {
        title: 'Total',
        dataIndex: 'total',
        key: 'total',
        width: 120,
        align: 'right',
        render: (total: number) => `RM ${Number(total).toFixed(2)}`,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (status: string) => (
          <Tag color={poStatusColors[status] || 'default'}>
            {status.replace(/_/g, ' ')}
          </Tag>
        ),
      },
      {
        title: '',
        key: 'actions',
        width: 80,
        render: (_: unknown, record: PurchaseOrder) => (
          <Link href={`/portal/vendor/purchase-orders/${record.id}`}>
            <Button type="link" size="small" icon={<EyeOutlined />}>
              View
            </Button>
          </Link>
        ),
      },
    ],
    [],
  );

  const billColumns: TableColumnsType<Bill> = useMemo(
    () => [
      {
        title: 'Bill #',
        dataIndex: 'billNumber',
        key: 'billNumber',
        width: 130,
        render: (num: string, record: Bill) => (
          <Link
            href={`/portal/vendor/bills/${record.id}`}
            style={{ fontWeight: 500 }}
          >
            {num}
          </Link>
        ),
      },
      {
        title: 'Due Date',
        dataIndex: 'dueDate',
        key: 'dueDate',
        width: 110,
        render: (date: string) => {
          const isOverdue = dayjs(date).isBefore(dayjs());
          return (
            <span style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
              {dayjs(date).format('DD/MM/YYYY')}
            </span>
          );
        },
      },
      {
        title: 'Total',
        dataIndex: 'total',
        key: 'total',
        width: 120,
        align: 'right',
        render: (total: number) => `RM ${Number(total).toFixed(2)}`,
      },
      {
        title: 'Balance',
        dataIndex: 'balance',
        key: 'balance',
        width: 120,
        align: 'right',
        render: (balance: number) => (
          <Text type={balance > 0 ? 'warning' : 'success'}>
            RM {Number(balance).toFixed(2)}
          </Text>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (status: string) => (
          <Tag color={billStatusColors[status] || 'default'}>
            {status.replace(/_/g, ' ')}
          </Tag>
        ),
      },
    ],
    [],
  );

  const paymentColumns: TableColumnsType<VendorPayment> = useMemo(
    () => [
      {
        title: 'Payment #',
        dataIndex: 'paymentNumber',
        key: 'paymentNumber',
        width: 140,
      },
      {
        title: 'Date',
        dataIndex: 'paymentDate',
        key: 'paymentDate',
        width: 110,
        render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
      },
      {
        title: 'Method',
        dataIndex: 'paymentMethod',
        key: 'paymentMethod',
        width: 120,
        render: (method: string) => method.replace(/_/g, ' '),
      },
      {
        title: 'Amount',
        dataIndex: 'amount',
        key: 'amount',
        width: 120,
        align: 'right',
        render: (amount: number) => (
          <Text strong>RM {Number(amount).toFixed(2)}</Text>
        ),
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Vendor Dashboard
      </Title>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Purchase Orders"
              value={data?.totalActivePOs || 0}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Confirmation"
              value={data?.pendingPOs?.length || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{
                color:
                  (data?.pendingPOs?.length || 0) > 0 ? '#cf1322' : undefined,
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Billed"
              value={Number(data?.totalBilledAmount || 0)}
              prefix={<FileTextOutlined />}
              precision={2}
              formatter={(value) => `RM ${Number(value).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Payments Received"
              value={Number(data?.totalPaidAmount || 0)}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{ color: '#3f8600' }}
              formatter={(value) => `RM ${Number(value).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`}
            />
          </Card>
        </Col>
      </Row>

      {/* Pending POs */}
      <Card
        title={
          <Space>
            <ClockCircleOutlined />
            <span>Purchase Orders Pending Confirmation</span>
          </Space>
        }
        extra={
          <Link href="/portal/vendor/purchase-orders">
            <Button type="link">View All</Button>
          </Link>
        }
        style={{ marginBottom: 24 }}
      >
        {data?.pendingPOs && data.pendingPOs.length > 0 ? (
          <Table
            columns={pendingPOColumns}
            dataSource={data.pendingPOs}
            rowKey="id"
            pagination={false}
            size="small"
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No purchase orders pending confirmation"
          >
            <CheckCircleOutlined
              style={{ fontSize: 24, color: '#52c41a', marginBottom: 8 }}
            />
          </Empty>
        )}
      </Card>

      <Row gutter={24}>
        {/* Open Bills */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <FileTextOutlined />
                <span>Open Bills</span>
              </Space>
            }
            extra={
              <Link href="/portal/vendor/bills">
                <Button type="link">View All</Button>
              </Link>
            }
            style={{ marginBottom: 24 }}
          >
            {data?.openBills && data.openBills.length > 0 ? (
              <Table
                columns={billColumns}
                dataSource={data.openBills}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No open bills"
              />
            )}
          </Card>
        </Col>

        {/* Recent Payments */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <DollarOutlined />
                <span>Recent Payments</span>
              </Space>
            }
            extra={
              <Link href="/portal/vendor/payments">
                <Button type="link">View All</Button>
              </Link>
            }
            style={{ marginBottom: 24 }}
          >
            {data?.recentPayments && data.recentPayments.length > 0 ? (
              <Table
                columns={paymentColumns}
                dataSource={data.recentPayments}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No recent payments"
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
