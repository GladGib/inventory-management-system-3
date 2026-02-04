'use client';

import { Card, List, Tag, Skeleton, Empty, Typography } from 'antd';
import { ExclamationCircleOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useDashboardAlertsFlat } from '@/hooks/use-dashboard';
import Link from 'next/link';

const { Text } = Typography;

/**
 * PendingActionsCard - List of alerts with priority colors
 *
 * Usage:
 * <PendingActionsCard />
 */
export function PendingActionsCard() {
  const { data: alerts, isLoading } = useDashboardAlertsFlat();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'blue';
      default:
        return 'default';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'medium':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'low':
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      LOW_STOCK: 'Low Stock',
      OVERDUE_INVOICE: 'Overdue Invoice',
      OVERDUE_BILL: 'Overdue Bill',
      PENDING_ORDER: 'Pending Order',
      EXPIRING_BATCH: 'Expiring Soon',
    };
    return labels[type] || type;
  };

  return (
    <Card title="Action Required" style={{ height: '100%' }}>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !alerts || alerts.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No pending actions"
          style={{ padding: '40px 0' }}
        />
      ) : (
        <List
          dataSource={alerts}
          renderItem={(alert) => (
            <List.Item style={{ cursor: alert.link ? 'pointer' : 'default' }}>
              {alert.link ? (
                <Link
                  href={alert.link}
                  style={{ width: '100%', textDecoration: 'none', color: 'inherit' }}
                >
                  <List.Item.Meta
                    avatar={getPriorityIcon(alert.priority)}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Tag color={getPriorityColor(alert.priority)}>
                          {getTypeLabel(alert.type)}
                        </Tag>
                        <Text strong>{alert.title}</Text>
                      </div>
                    }
                    description={alert.message}
                  />
                </Link>
              ) : (
                <List.Item.Meta
                  avatar={getPriorityIcon(alert.priority)}
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Tag color={getPriorityColor(alert.priority)}>{getTypeLabel(alert.type)}</Tag>
                      <Text strong>{alert.title}</Text>
                    </div>
                  }
                  description={alert.message}
                />
              )}
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
