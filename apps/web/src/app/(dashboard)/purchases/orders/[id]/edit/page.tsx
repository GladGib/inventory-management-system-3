'use client';

import { use, useState, useMemo, useEffect } from 'react';
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
  Spin,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { usePurchaseOrder, useUpdatePurchaseOrder } from '@/hooks/use-purchases';
import {
  VendorSelect,
  PurchaseLineItemsTable,
  PurchaseLineItem,
  PurchaseOrderSummary,
  calculatePurchaseOrderTotals,
} from '@/components/purchases';
import { WarehouseSelect } from '@/components/inventory';
import { UpdatePurchaseOrderDto } from '@/lib/purchases';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function EditPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [form] = Form.useForm();

  const { data: order, isLoading } = usePurchaseOrder(id);
  const updateOrder = useUpdatePurchaseOrder();

  const [lineItems, setLineItems] = useState<PurchaseLineItem[]>([]);

  // Initialize form when order loads
  useEffect(() => {
    if (order) {
      form.setFieldsValue({
        vendorId: order.vendorId,
        orderDate: dayjs(order.orderDate),
        expectedDate: order.expectedDate ? dayjs(order.expectedDate) : undefined,
        warehouseId: order.warehouseId,
        referenceNumber: order.referenceNumber,
        discountAmount: order.discountAmount,
        shippingCharges: order.shippingCharges,
        notes: order.notes,
      });

      // Convert order items to line items
      setLineItems(
        order.items.map((item, index) => ({
          key: `item-${index}`,
          itemId: item.itemId,
          itemName: item.item.name,
          itemSku: item.item.sku,
          unit: item.item.unit,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent || 0,
          taxRateId: item.taxRateId,
          taxRate: item.taxRate?.rate || 0,
          amount: item.amount,
          taxAmount: item.taxAmount,
        }))
      );
    }
  }, [order, form]);

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

    const orderData: UpdatePurchaseOrderDto = {
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

    updateOrder.mutate(
      { id, data: orderData },
      {
        onSuccess: () => {
          router.push(`/purchases/orders/${id}`);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Text>Purchase order not found</Text>
      </div>
    );
  }

  if (order.status !== 'DRAFT') {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Text>Only draft orders can be edited</Text>
        <br />
        <Link href={`/purchases/orders/${id}`}>
          <Button type="primary" style={{ marginTop: 16 }}>
            View Order
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href={`/purchases/orders/${id}`}>
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <Title level={4} style={{ margin: 0 }}>
          Edit {order.orderNumber}
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
          <Link href={`/purchases/orders/${id}`}>
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
