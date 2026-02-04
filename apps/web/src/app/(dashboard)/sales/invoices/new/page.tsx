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
import { useCreateInvoice } from '@/hooks/use-sales';
import {
  CustomerSelect,
  LineItemsTable,
  LineItem,
  OrderSummary,
  calculateOrderTotals,
} from '@/components/sales';
import { CreateInvoiceDto, DiscountType } from '@/lib/sales';

const { Title } = Typography;
const { TextArea } = Input;

export default function NewInvoicePage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const createInvoice = useCreateInvoice();

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

  const totals = useMemo(() => {
    return calculateOrderTotals(lineItems, discountType, discountValue, 0);
  }, [lineItems, discountType, discountValue]);

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

    // Validate due date
    const invoiceDate = values.invoiceDate as dayjs.Dayjs;
    const dueDate = values.dueDate as dayjs.Dayjs;
    if (dueDate && invoiceDate && dueDate.isBefore(invoiceDate)) {
      form.setFields([
        {
          name: 'dueDate',
          errors: ['Due date must be on or after invoice date'],
        },
      ]);
      return;
    }

    const invoiceData: CreateInvoiceDto = {
      customerId: values.customerId as string,
      invoiceDate: invoiceDate?.toDate(),
      dueDate: dueDate?.toDate(),
      discountType: values.discountType as DiscountType,
      discountValue: values.discountValue as number,
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

    createInvoice.mutate(invoiceData, {
      onSuccess: (invoice) => {
        router.push(`/sales/invoices/${invoice.id}`);
      },
    });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/sales/invoices">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <Title level={4} style={{ margin: 0 }}>
          New Invoice
        </Title>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          invoiceDate: dayjs(),
          dueDate: dayjs().add(30, 'day'),
          discountType: 'PERCENTAGE',
        }}
      >
        <Row gutter={24}>
          {/* Main Form */}
          <Col span={16}>
            <Card title="Invoice Details">
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
                  <Form.Item name="invoiceDate" label="Invoice Date">
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    name="dueDate"
                    label="Due Date"
                    rules={[{ required: true, message: 'Please select due date' }]}
                  >
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
              <Form.Item name="notes" label="Notes">
                <TextArea rows={3} placeholder="Invoice notes" />
              </Form.Item>
            </Card>
          </Col>

          {/* Sidebar */}
          <Col span={8}>
            <Card title="Discount">
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
            </Card>

            <div style={{ marginTop: 16 }}>
              <OrderSummary
                subtotal={totals.subtotal}
                discount={totals.discount}
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
          <Link href="/sales/invoices">
            <Button>Cancel</Button>
          </Link>
          <Button type="primary" htmlType="submit" loading={createInvoice.isPending}>
            Create Invoice
          </Button>
        </div>
      </Form>
    </div>
  );
}
