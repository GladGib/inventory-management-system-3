'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Typography, Form, Input, Button, Space, Row, Col, DatePicker, Alert } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useCreateTransfer } from '@/hooks/use-inventory';
import { WarehouseSelect } from '@/components/inventory';
import { TransferItemsTable, TransferLineItem } from '@/components/inventory/TransferItemsTable';
import { CreateTransferDto } from '@/lib/inventory';

const { Title } = Typography;
const { TextArea } = Input;

export default function NewTransferPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const createTransfer = useCreateTransfer();

  const [lineItems, setLineItems] = useState<TransferLineItem[]>([]);
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>();
  const [destinationWarehouseId, setDestinationWarehouseId] = useState<string>();

  const handleSourceChange = (warehouseId: string) => {
    setSourceWarehouseId(warehouseId);
    // Clear line items when source warehouse changes
    setLineItems([]);
  };

  const handleDestinationChange = (warehouseId: string) => {
    setDestinationWarehouseId(warehouseId);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    // Validate line items
    const validItems = lineItems.filter((item) => item.itemId && item.quantity > 0);
    if (validItems.length === 0) {
      form.setFields([
        {
          name: 'items',
          errors: ['At least one item with quantity is required'],
        },
      ]);
      return;
    }

    // Validate different warehouses
    if (values.sourceWarehouseId === values.destinationWarehouseId) {
      form.setFields([
        {
          name: 'destinationWarehouseId',
          errors: ['Destination must be different from source'],
        },
      ]);
      return;
    }

    const transferData: CreateTransferDto = {
      sourceWarehouseId: values.sourceWarehouseId as string,
      destinationWarehouseId: values.destinationWarehouseId as string,
      transferDate: values.transferDate ? (values.transferDate as dayjs.Dayjs).toDate() : undefined,
      notes: values.notes as string,
      items: validItems.map((item) => ({
        itemId: item.itemId!,
        quantity: item.quantity,
      })),
    };

    createTransfer.mutate(transferData, {
      onSuccess: (transfer) => {
        router.push(`/inventory/transfers/${transfer.id}`);
      },
    });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/inventory/transfers">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <Title level={4} style={{ margin: 0 }}>
          New Inventory Transfer
        </Title>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          transferDate: dayjs(),
        }}
      >
        <Row gutter={24}>
          <Col span={24}>
            <Card title="Transfer Details">
              <Row gutter={16} align="middle">
                <Col span={8}>
                  <Form.Item
                    name="sourceWarehouseId"
                    label="From Warehouse"
                    rules={[{ required: true, message: 'Please select source warehouse' }]}
                  >
                    <WarehouseSelect
                      style={{ width: '100%' }}
                      onChange={handleSourceChange}
                      excludeId={destinationWarehouseId}
                    />
                  </Form.Item>
                </Col>
                <Col span={2} style={{ textAlign: 'center', paddingTop: 30 }}>
                  <ArrowRightOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="destinationWarehouseId"
                    label="To Warehouse"
                    rules={[{ required: true, message: 'Please select destination warehouse' }]}
                  >
                    <WarehouseSelect
                      style={{ width: '100%' }}
                      onChange={handleDestinationChange}
                      excludeId={sourceWarehouseId}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="transferDate" label="Transfer Date">
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Items to Transfer" style={{ marginTop: 16 }}>
              {!sourceWarehouseId && (
                <Alert
                  message="Select Source Warehouse"
                  description="Please select the source warehouse to see available items."
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
              <Form.Item name="items" noStyle>
                <TransferItemsTable
                  items={lineItems}
                  onChange={setLineItems}
                  sourceWarehouseId={sourceWarehouseId}
                />
              </Form.Item>
            </Card>

            <Card title="Additional Information" style={{ marginTop: 16 }}>
              <Form.Item name="notes" label="Notes">
                <TextArea rows={3} placeholder="Transfer notes or special instructions" />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        {/* Actions */}
        <div
          style={{
            marginTop: 24,
            padding: '16px 0',
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <Link href="/inventory/transfers">
            <Button>Cancel</Button>
          </Link>
          <Button type="primary" htmlType="submit" loading={createTransfer.isPending}>
            Create Transfer
          </Button>
        </div>
      </Form>
    </div>
  );
}
