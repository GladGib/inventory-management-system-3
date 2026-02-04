'use client';

import { Card, List, Skeleton, Empty, Typography, Tag } from 'antd';
import {
  FileTextOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { useDashboardOverview } from '@/hooks/use-dashboard';
import Link from 'next/link';

const { Text } = Typography;

interface RecentInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  total: number;
  status: string;
  customer: { displayName: string };
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  total: number;
  status: string;
  customer: { displayName: string };
}

type ActivityItem =
  | { type: 'invoice'; data: RecentInvoice }
  | { type: 'order'; data: RecentOrder };

/**
 * RecentActivityCard - Activity feed from recent invoices and orders
 *
 * Usage:
 * <RecentActivityCard />
 */
export function RecentActivityCard() {
  const { data: overview, isLoading } = useDashboardOverview();

  // Combine and sort invoices and orders by date
  const activities: ActivityItem[] = [];

  overview?.recentActivity?.invoices?.forEach((inv) => {
    activities.push({ type: 'invoice', data: inv });
  });

  overview?.recentActivity?.orders?.forEach((order) => {
    activities.push({ type: 'order', data: order });
  });

  // Sort by date (most recent first)
  activities.sort((a, b) => {
    const dateA = new Date(a.type === 'invoice' ? a.data.invoiceDate : a.data.orderDate);
    const dateB = new Date(b.type === 'invoice' ? b.data.invoiceDate : b.data.orderDate);
    return dateB.getTime() - dateA.getTime();
  });

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      DRAFT: 'default',
      CONFIRMED: 'processing',
      SENT: 'blue',
      PAID: 'success',
      PARTIALLY_PAID: 'warning',
      OVERDUE: 'error',
      VOID: 'default',
      PACKED: 'cyan',
      SHIPPED: 'purple',
      DELIVERED: 'success',
    };
    return statusColors[status] || 'default';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    return `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Card title="Recent Activity" style={{ height: '100%' }}>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : activities.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No recent activity"
          style={{ padding: '40px 0' }}
        />
      ) : (
        <List
          dataSource={activities.slice(0, 10)}
          renderItem={(activity) => {
            const isInvoice = activity.type === 'invoice';
            const data = activity.data;
            const number = isInvoice ? (data as RecentInvoice).invoiceNumber : (data as RecentOrder).orderNumber;
            const date = isInvoice ? (data as RecentInvoice).invoiceDate : (data as RecentOrder).orderDate;
            const link = isInvoice ? `/sales/invoices/${data.id}` : `/sales/orders/${data.id}`;

            return (
              <List.Item>
                <Link href={link} style={{ width: '100%', textDecoration: 'none', color: 'inherit' }}>
                  <List.Item.Meta
                    avatar={
                      isInvoice ? (
                        <FileTextOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                      ) : (
                        <ShoppingCartOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                      )
                    }
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Tag color={isInvoice ? 'blue' : 'green'}>
                          {isInvoice ? 'Invoice' : 'Order'}
                        </Tag>
                        <Text strong>{number}</Text>
                        <Tag color={getStatusColor(data.status)}>{data.status}</Tag>
                      </div>
                    }
                    description={
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {data.customer.displayName} • {formatDate(date)}
                        </Text>
                        <Text strong style={{ fontSize: 12 }}>
                          {formatCurrency(Number(data.total))}
                        </Text>
                      </div>
                    }
                  />
                </Link>
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
}
