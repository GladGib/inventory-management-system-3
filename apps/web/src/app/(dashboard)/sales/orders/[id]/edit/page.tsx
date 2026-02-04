'use client';

import { useState, useMemo, useEffect } from 'react';
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
  Spin,
  Result,
  message,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSalesOrder, useUpdateSalesOrder } from '@/hooks/use-sales';
import {
  CustomerSelect,
  LineItemsTable,
  LineItem,
  OrderSummary,
  calculateOrderTotals,
} from '@/components/sales';
import { UpdateSalesOrderDto, DiscountType } from '@/lib/sales';

const { Title } = Typography;
const { TextArea } = Input;

interface PageProps {
  params: { id: string };
}

export default function EditSalesOrderPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();
  const [form] = Form.useForm();
  const updateOrder = useUpdateSalesOrder();

  const { data: order, isLoading, error } = useSalesOrder(id);

  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Populate form and line items when order loads
  useEffect(() => {
    if (order) {
      // Check if order can be edited
      if (order.status !== 'DRAFT') {
        message.warning('Only draft orders can be edited');
        router.push(`/sales/orders/${id}`);
        return;
      }

      form.setFieldsValue({
        customerId: order.customerId,
        orderDate: dayjs(order.orderDate),
        expectedShipDate: order.expectedShipDate ? dayjs(order.expectedShipDate) : undefined,
        warehouseId: order.warehouseId,
        discountType: order.discountType || 'PERCENTAGE',
        discountValue: order.discountValue,
        shippingCharges: order.shippingCharges,
        notes: order.notes,
        termsConditions: order.termsConditions,
      });

      // Note: API uses 'rate' for unitPrice and 'discountValue' for discountPercent
      setLineItems(
        order.items.map((item, index) => ({
          key: `item-${index}`,
          itemId: item.itemId,
          itemName: item.item.name,
          itemSku: item.item.sku,
          unit: item.item.unit,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discountPercent: Number(item.discountPercent) || 0,
          taxRateId: item.taxRateId,
          taxRate: Number(item.taxRate?.rate) || 0,
          amount: Number(item.amount),
          taxAmount: Number(item.taxAmount),
        }))
      );
    }
  }, [order, form, router, id]);

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

    const orderData: UpdateSalesOrderDto = {
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

    updateOrder.mutate(
      { id, data: orderData },
      {
        onSuccess: () => {
          router.push(`/sales/orders/${id}`);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <Result
        status="404"
        title="Order not found"
        subTitle="The sales order you're looking for doesn't exist."
        extra={
          <Link href="/sales/orders">
            <Button type="primary">Back to Orders</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href={`/sales/orders/${id}`}>
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <Title level={4} style={{ margin: 0 }}>
          Edit Sales Order - {order.orderNumber}
        </Title>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
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
          <Link href={`/sales/orders/${id}`}>
            <Button>Cancel</Button>
          </Link>
          <Button type="primary" htmlType="submit" loading={updateOrder.isPending}>
            Save Changes
          </Button>
        </div>
      </Form>
    </div>
  );
}
