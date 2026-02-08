'use client';

import { use, useState } from 'react';
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
  Tag,
  Modal,
  Form,
  InputNumber,
  Input,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { ArrowLeftOutlined, SwapOutlined } from '@ant-design/icons';
import { useBatch, useBatchAdjustment } from '@/hooks/use-batches';
import { BatchStatusTag, ExpiryAlert } from '@/components/batch';
import type { BatchTransaction, BatchTransactionType } from '@/lib/batch';

const { Title, Text } = Typography;

const txTypeLabels: Record<BatchTransactionType, string> = {
  RECEIVE: 'Received',
  SALE: 'Sale',
  ADJUSTMENT: 'Adjustment',
  TRANSFER_IN: 'Transfer In',
  TRANSFER_OUT: 'Transfer Out',
  RETURN: 'Return',
  WRITE_OFF: 'Write-Off',
};

const txTypeColors: Record<BatchTransactionType, string> = {
  RECEIVE: 'green',
  SALE: 'blue',
  ADJUSTMENT: 'orange',
  TRANSFER_IN: 'cyan',
  TRANSFER_OUT: 'purple',
  RETURN: 'gold',
  WRITE_OFF: 'red',
};

export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustForm] = Form.useForm();

  const { data: batch, isLoading } = useBatch(id);
  const adjustMutation = useBatchAdjustment();

  const daysUntilExpiry = batch?.expiryDate
    ? Math.ceil((new Date(batch.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const historyColumns: TableColumnsType<BatchTransaction> = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (type: BatchTransactionType) => (
        <Tag color={txTypeColors[type]}>{txTypeLabels[type]}</Tag>
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      render: (qty: number, record) => {
        const isPositive = ['RECEIVE', 'TRANSFER_IN', 'RETURN'].includes(record.type);
        return (
          <Text type={isPositive ? 'success' : 'danger'} strong>
            {isPositive ? '+' : '-'}
            {Math.abs(qty).toLocaleString()}
          </Text>
        );
      },
    },
    {
      title: 'Reference',
      key: 'reference',
      render: (_, record) =>
        record.referenceType
          ? `${record.referenceType}${record.referenceId ? ` #${record.referenceId.substring(0, 8)}` : ''}`
          : '-',
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (notes: string | null) => notes || '-',
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
  ];

  const handleAdjust = async (values: { quantity: number; reason: string; notes?: string }) => {
    await adjustMutation.mutateAsync({
      batchId: id,
      quantity: values.quantity,
      reason: values.reason,
      notes: values.notes,
    });
    setAdjustModalOpen(false);
    adjustForm.resetFields();
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Text>Batch not found</Text>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/inventory/batches">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              Batch: {batch.batchNumber}
            </Title>
            <BatchStatusTag status={batch.status} />
          </Space>
          <Space>
            <Button icon={<SwapOutlined />} onClick={() => setAdjustModalOpen(true)}>
              Adjust
            </Button>
          </Space>
        </div>
      </div>

      <ExpiryAlert daysUntilExpiry={daysUntilExpiry} style={{ marginBottom: 16 }} />

      <Row gutter={24}>
        <Col span={24}>
          {/* Batch Details */}
          <Card title="Batch Information" style={{ marginBottom: 16 }}>
            <Descriptions column={3}>
              <Descriptions.Item label="Batch Number">
                <Text strong>{batch.batchNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Item">
                <Text strong>{batch.item.sku}</Text>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  {batch.item.name}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Warehouse">
                <Text strong>{batch.warehouse.name}</Text>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  ({batch.warehouse.code})
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Current Quantity">
                <Text strong style={{ fontSize: 16 }}>
                  {batch.quantity.toLocaleString()}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Initial Quantity">
                {batch.initialQuantity.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <BatchStatusTag status={batch.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Manufacture Date">
                {batch.manufactureDate ? dayjs(batch.manufactureDate).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Expiry Date">
                {batch.expiryDate ? (
                  <Space>
                    {dayjs(batch.expiryDate).format('DD/MM/YYYY')}
                    {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                      <Text type="secondary">({daysUntilExpiry} days left)</Text>
                    )}
                    {daysUntilExpiry !== null && daysUntilExpiry <= 0 && (
                      <Tag color="red">Expired</Tag>
                    )}
                  </Space>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {dayjs(batch.createdAt).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
            </Descriptions>
            {batch.notes && (
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">Notes: </Text>
                <Text>{batch.notes}</Text>
              </div>
            )}
          </Card>

          {/* Transaction History */}
          <Card title="Transaction History">
            <Table
              columns={historyColumns}
              dataSource={batch.transactions || []}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* Adjust Modal */}
      <Modal
        title="Batch Adjustment"
        open={adjustModalOpen}
        onCancel={() => {
          setAdjustModalOpen(false);
          adjustForm.resetFields();
        }}
        onOk={() => adjustForm.submit()}
        confirmLoading={adjustMutation.isPending}
      >
        <Form form={adjustForm} layout="vertical" onFinish={handleAdjust}>
          <Form.Item
            name="quantity"
            label="Quantity Adjustment"
            rules={[{ required: true, message: 'Enter adjustment quantity' }]}
            extra="Use negative values to decrease stock"
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Enter a reason' }]}
          >
            <Input placeholder="e.g. Damaged, Count correction, etc." />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Additional notes (optional)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
