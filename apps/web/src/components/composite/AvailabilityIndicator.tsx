'use client';

import { Card, Typography, Space, Alert, Spin } from 'antd';
import { CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import type { BOMAvailability } from '@/lib/composite';

const { Text, Title } = Typography;

interface AvailabilityIndicatorProps {
  availability?: BOMAvailability;
  isLoading?: boolean;
}

export function AvailabilityIndicator({ availability, isLoading }: AvailabilityIndicatorProps) {
  if (isLoading) {
    return (
      <Card size="small" title="Availability">
        <Spin />
      </Card>
    );
  }

  if (!availability) {
    return (
      <Card size="small" title="Availability">
        <Text type="secondary">No availability data</Text>
      </Card>
    );
  }

  const canBuild = availability.availableQty > 0;

  return (
    <Card size="small" title="Build Availability">
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {canBuild ? (
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
          ) : (
            <WarningOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
          )}
          <Title level={4} style={{ margin: 0 }}>
            Can build: {availability.availableQty} units
          </Title>
        </div>

        {availability.limitingComponent && (
          <Alert
            type={canBuild ? 'info' : 'warning'}
            showIcon
            message={
              <span>
                Limited by:{' '}
                <Text strong>
                  {availability.limitingComponent.sku} - {availability.limitingComponent.name}
                </Text>
              </span>
            }
          />
        )}

        {availability.components.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Component stock breakdown:
            </Text>
            {availability.components.map((comp) => (
              <div
                key={comp.componentItemId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <Text style={{ fontSize: 13 }}>
                  {comp.componentItem.sku} - {comp.componentItem.name}
                </Text>
                <Space size="small">
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Stock: {comp.availableStock}
                  </Text>
                  <Text style={{ fontSize: 13 }}>({comp.canBuild} builds)</Text>
                </Space>
              </div>
            ))}
          </div>
        )}
      </Space>
    </Card>
  );
}
