'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Typography, Form, Input, Button, Space, Row, Col, DatePicker, Alert } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useCreateAdjustment } from '@/hooks/use-inventory';
import { WarehouseSelect } from '@/components/inventory';
import {
  AdjustmentItemsTable,
  AdjustmentLineItem,
} from '@/components/inventory/AdjustmentItemsTable';
import { CreateAdjustmentDto } from '@/lib/inventory';

const { Title } = Typography;
const { TextArea } = Input;

export default function NewAdjustmentPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const createAdjustment = useCreateAdjustment();

  const [lineItems, setLineItems] = useState<AdjustmentLineItem[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>();

  const handleWarehouseChange = (warehouseId: string) => {
    setSelectedWarehouseId(warehouseId);
    // Clear line items when warehouse changes
    setLineItems([]);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    // Validate line items
    const validItems = lineItems.filter((item) => item.itemId && item.quantity !== 0);
    if (validItems.length === 0) {
      form.setFields([
        {
          name: 'items',
          errors: ['At least one item with non-zero quantity is required'],
        },
      ]);
      return;
    }

    const adjustmentData: CreateAdjustmentDto = {
      warehouseId: values.warehouseId as string,
      adjustmentDate: values.adjustmentDate
        ? (values.adjustmentDate as dayjs.Dayjs).toDate()
        : undefined,
      notes: values.notes as string,
      items: validItems.map((item) => ({
        itemId: item.itemId!,
        quantity: item.quantity,
        reason: item.reason,
        notes: item.notes,
      })),
    };

    createAdjustment.mutate(adjustmentData, {
      onSuccess: (adjustment) => {
        router.push(`/inventory/adjustments/${adjustment.id}`);
      },
    });
  };

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
        <Title level={4} style={{ margin: 0 }}>
          New Inventory Adjustment
        </Title>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          adjustmentDate: dayjs(),
        }}
      >
        <Row gutter={24}>
          <Col span={24}>
            <Card title="Adjustment Details">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="warehouseId"
                    label="Warehouse"
                    rules={[{ required: true, message: 'Please select a warehouse' }]}
                  >
                    <WarehouseSelect style={{ width: '100%' }} onChange={handleWarehouseChange} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="adjustmentDate" label="Adjustment Date">
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Items to Adjust" style={{ marginTop: 16 }}>
              <Alert
                message="Adjustment Quantities"
                description="Enter positive values to increase stock, negative values to decrease stock."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Form.Item name="items" noStyle>
                <AdjustmentItemsTable
                  items={lineItems}
                  onChange={setLineItems}
                  warehouseId={selectedWarehouseId}
                />
              </Form.Item>
            </Card>

            <Card title="Additional Information" style={{ marginTop: 16 }}>
              <Form.Item name="notes" label="Notes">
                <TextArea rows={3} placeholder="Reason for adjustment or additional notes" />
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
          <Link href="/inventory/adjustments">
            <Button>Cancel</Button>
          </Link>
          <Button type="primary" htmlType="submit" loading={createAdjustment.isPending}>
            Create Adjustment
          </Button>
        </div>
      </Form>
    </div>
  );
}
