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
  Select,
  Button,
  Space,
  Row,
  Col,
  DatePicker,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useCreateSalesOrder } from '@/hooks/use-sales';
import {
  CustomerSelect,
  LineItemsTable,
  LineItem,
  OrderSummary,
  calculateOrderTotals,
} from '@/components/sales';
import { CreateSalesOrderDto, DiscountType } from '@/lib/sales';

const { Title } = Typography;
const { TextArea } = Input;

export default function NewSalesOrderPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const createOrder = useCreateSalesOrder();

  const [lineItems, setLineItems] = useState<LineItem[]>([
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

  const discountType = Form.useWatch('discountType', form);
  const discountValue = Form.useWatch('discountValue', form);
  const shippingCharges = Form.useWatch('shippingCharges', form);

  const totals = useMemo(() => {
    return calculateOrderTotals(lineItems, discountType, discountValue, shippingCharges);
  }, [lineItems, discountType, discountValue, shippingCharges]);

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

    const orderData: CreateSalesOrderDto = {
      customerId: values.customerId as string,
      orderDate: values.orderDate ? (values.orderDate as dayjs.Dayjs).toDate() : undefined,
      expectedShipDate: values.expectedShipDate
        ? (values.expectedShipDate as dayjs.Dayjs).toDate()
        : undefined,
      warehouseId: values.warehouseId as string,
      discountType: values.discountType as DiscountType,
      discountValue: values.discountValue as number,
      shippingCharges: values.shippingCharges as number,
      notes: values.notes as string,
      termsConditions: values.termsConditions as string,
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
        router.push(`/sales/orders/${order.id}`);
      },
    });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/sales/orders">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <Title level={4} style={{ margin: 0 }}>
          New Sales Order
        </Title>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          orderDate: dayjs(),
          discountType: 'PERCENTAGE',
        }}
      >
        <Row gutter={24}>
          {/* Main Form */}
          <Col span={16}>
            <Card title="Order Details">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="customerId"
                    label="Customer"
                    rules={[{ required: true, message: 'Please select a customer' }]}
                  >
                    <CustomerSelect style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="orderDate" label="Order Date">
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="expectedShipDate" label="Expected Ship Date">
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Line Items" style={{ marginTop: 16 }}>
              <Form.Item name="items" noStyle>
                <LineItemsTable items={lineItems} onChange={setLineItems} />
              </Form.Item>
            </Card>

            <Card title="Additional Information" style={{ marginTop: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="notes" label="Notes">
                    <TextArea rows={3} placeholder="Internal notes" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="termsConditions" label="Terms & Conditions">
                    <TextArea rows={3} placeholder="Terms and conditions" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Sidebar */}
          <Col span={8}>
            <Card title="Discount & Shipping">
              <Form.Item label="Discount">
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item name="discountType" noStyle>
                    <Select style={{ width: 120 }}>
                      <Select.Option value="PERCENTAGE">Percentage</Select.Option>
                      <Select.Option value="FIXED">Fixed</Select.Option>
                    </Select>
                  </Form.Item>
                  <Form.Item name="discountValue" noStyle>
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      max={discountType === 'PERCENTAGE' ? 100 : undefined}
                      precision={2}
                      placeholder="0"
                      suffix={discountType === 'PERCENTAGE' ? '%' : ''}
                      prefix={discountType === 'FIXED' ? 'RM' : ''}
                    />
                  </Form.Item>
                </Space.Compact>
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
              <OrderSummary
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
          <Link href="/sales/orders">
            <Button>Cancel</Button>
          </Link>
          <Button type="primary" htmlType="submit" loading={createOrder.isPending}>
            Create Order
          </Button>
        </div>
      </Form>
    </div>
  );
}
