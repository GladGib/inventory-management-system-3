'use client';

import { use } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import {
  Card,
  Typography,
  Button,
  Space,
  Row,
  Col,
  Descriptions,
  Table,
  Spin,
  Alert,
  Tag,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useAdjustment } from '@/hooks/use-inventory';
import { AdjustmentItem, AdjustmentReason } from '@/lib/inventory';

const { Title, Text } = Typography;

const reasonLabels: Record<AdjustmentReason, string> = {
  OPENING_STOCK: 'Opening Stock',
  DAMAGE: 'Damage',
  LOSS: 'Loss',
  RETURN: 'Return',
  FOUND: 'Found',
  CORRECTION: 'Correction',
  OTHER: 'Other',
};

const reasonColors: Record<AdjustmentReason, string> = {
  OPENING_STOCK: 'blue',
  DAMAGE: 'red',
  LOSS: 'red',
  RETURN: 'green',
  FOUND: 'green',
  CORRECTION: 'orange',
  OTHER: 'default',
};

export default function AdjustmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: adjustment, isLoading } = useAdjustment(id);

  const columns: TableColumnsType<AdjustmentItem> = [
    {
      title: 'Item',
      key: 'item',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.item.sku}</Text>
          <Text>{record.item.name}</Text>
        </Space>
      ),
    },
    {
      title: 'Adjustment Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 150,
      render: (qty, record) => {
        const isPositive = qty > 0;
        return (
          <Text type={isPositive ? 'success' : 'danger'} strong>
            {isPositive ? '+' : ''}
            {qty} {record.item.unit}
          </Text>
        );
      },
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      width: 150,
      render: (reason: AdjustmentReason) => (
        <Tag color={reasonColors[reason]}>{reasonLabels[reason]}</Tag>
      ),
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes) => notes || '-',
    },
  ];

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!adjustment) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Text>Adjustment not found</Text>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/inventory/adjustments">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              {adjustment.adjustmentNumber}
            </Title>
            <Tag color="green">Completed</Tag>
          </Space>
        </div>
      </div>

      <Row gutter={24}>
        <Col span={24}>
          {/* Adjustment Details */}
          <Card title="Adjustment Details" style={{ marginBottom: 16 }}>
            <Descriptions column={3}>
              <Descriptions.Item label="Warehouse">
                <Text strong>{adjustment.warehouse.name}</Text>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  ({adjustment.warehouse.code})
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Adjustment Date">
                {dayjs(adjustment.adjustmentDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {dayjs(adjustment.createdAt).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Alert
            message="Adjustments are Permanent"
            description="Once created, inventory adjustments cannot be modified or deleted. If you need to correct this adjustment, create a new adjustment with the opposite quantities."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          {/* Adjustment Items */}
          <Card title="Adjusted Items">
            <Table
              columns={columns}
              dataSource={adjustment.items}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>

          {/* Notes */}
          {adjustment.notes && (
            <Card title="Notes" style={{ marginTop: 16 }}>
              <Text>{adjustment.notes}</Text>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
