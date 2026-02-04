'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  Typography,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Row,
  Col,
  DatePicker,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useCreatePurchaseOrder } from '@/hooks/use-purchases';
import {
  VendorSelect,
  PurchaseLineItemsTable,
  PurchaseLineItem,
  PurchaseOrderSummary,
  calculatePurchaseOrderTotals,
} from '@/components/purchases';
import { WarehouseSelect } from '@/components/inventory';
import { CreatePurchaseOrderDto } from '@/lib/purchases';

const { Title } = Typography;
const { TextArea } = Input;

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const createOrder = useCreatePurchaseOrder();

  const [lineItems, setLineItems] = useState<PurchaseLineItem[]>([
    {
      key: 'item-1',
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      taxRate: 0,
      amount: 0,
      taxAmount: 0,
    },
  ]);

  const discountAmount = Form.useWatch('discountAmount', form);
  const shippingCharges = Form.useWatch('shippingCharges', form);

  const totals = useMemo(() => {
    return calculatePurchaseOrderTotals(lineItems, discountAmount, shippingCharges);
  }, [lineItems, discountAmount, shippingCharges]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    // Validate line items
    const validItems = lineItems.filter((item) => item.itemId);
    if (validItems.length === 0) {
      form.setFields([
        {
          name: 'items',
          errors: ['At least one item is required'],
        },
      ]);
      return;
    }

    const orderData: CreatePurchaseOrderDto = {
      vendorId: values.vendorId as string,
      orderDate: values.orderDate ? (values.orderDate as dayjs.Dayjs).toDate() : undefined,
      expectedDate: values.expectedDate ? (values.expectedDate as dayjs.Dayjs).toDate() : undefined,
      warehouseId: values.warehouseId as string,
      discountAmount: values.discountAmount as number,
      shippingCharges: values.shippingCharges as number,
      referenceNumber: values.referenceNumber as string,
      notes: values.notes as string,
      items: validItems.map((item) => ({
        itemId: item.itemId!,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent || undefined,
        taxRateId: item.taxRateId,
      })),
    };

    createOrder.mutate(orderData, {
      onSuccess: (order) => {
        router.push(`/purchases/orders/${order.id}`);
      },
    });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/purchases/orders">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <Title level={4} style={{ margin: 0 }}>
          New Purchase Order
        </Title>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          orderDate: dayjs(),
        }}
      >
        <Row gutter={24}>
          {/* Main Form */}
          <Col span={16}>
            <Card title="Order Details">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="vendorId"
                    label="Vendor"
                    rules={[{ required: true, message: 'Please select a vendor' }]}
                  >
                    <VendorSelect style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="orderDate" label="Order Date">
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="expectedDate" label="Expected Delivery">
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="warehouseId" label="Delivery Warehouse">
                    <WarehouseSelect style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="referenceNumber" label="Vendor Reference #">
                    <Input placeholder="Vendor quote or reference number" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Line Items" style={{ marginTop: 16 }}>
              <Form.Item name="items" noStyle>
                <PurchaseLineItemsTable items={lineItems} onChange={setLineItems} />
              </Form.Item>
            </Card>

            <Card title="Additional Information" style={{ marginTop: 16 }}>
              <Form.Item name="notes" label="Notes">
                <TextArea rows={3} placeholder="Internal notes or special instructions" />
              </Form.Item>
            </Card>
          </Col>

          {/* Sidebar */}
          <Col span={8}>
            <Card title="Discount & Shipping">
              <Form.Item name="discountAmount" label="Discount Amount">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  placeholder="0.00"
                  prefix="RM"
                />
              </Form.Item>

              <Form.Item name="shippingCharges" label="Shipping Charges">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  placeholder="0.00"
                  prefix="RM"
                />
              </Form.Item>
            </Card>

            <div style={{ marginTop: 16 }}>
              <PurchaseOrderSummary
                subtotal={totals.subtotal}
                discount={totals.discount}
                shipping={totals.shipping}
                taxAmount={totals.taxAmount}
                total={totals.total}
              />
            </div>
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
          <Link href="/purchases/orders">
            <Button>Cancel</Button>
          </Link>
          <Button type="primary" htmlType="submit" loading={createOrder.isPending}>
            Create Purchase Order
          </Button>
        </div>
      </Form>
    </div>
  );
}
