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
import { useInvoice } from '@/hooks/use-sales';
import {
  CustomerSelect,
  LineItemsTable,
  LineItem,
  OrderSummary,
  calculateOrderTotals,
} from '@/components/sales';
import { DiscountType } from '@/lib/sales';
import { api } from '@/lib/api';

const { Title } = Typography;
const { TextArea } = Input;

interface PageProps {
  params: { id: string };
}

export default function EditInvoicePage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: invoice, isLoading, error } = useInvoice(id);

  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Populate form and line items when invoice loads
  useEffect(() => {
    if (invoice) {
      // Check if invoice can be edited
      if (invoice.status !== 'DRAFT') {
        message.warning('Only draft invoices can be edited');
        router.push(`/sales/invoices/${id}`);
        return;
      }

      form.setFieldsValue({
        customerId: invoice.customerId,
        invoiceDate: dayjs(invoice.invoiceDate),
        dueDate: dayjs(invoice.dueDate),
        discountType: 'PERCENTAGE',
        discountValue: invoice.discount,
      });

      setLineItems(
        invoice.items.map((item, index) => ({
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
  }, [invoice, form, router, id]);

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

    setIsSubmitting(true);

    try {
      const invoiceData = {
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

      await api.put(`/sales/invoices/${id}`, invoiceData);
      message.success('Invoice updated successfully');
      router.push(`/sales/invoices/${id}`);
    } catch (err) {
      const error = err as Error & { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Failed to update invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <Result
        status="404"
        title="Invoice not found"
        subTitle="The invoice you're looking for doesn't exist."
        extra={
          <Link href="/sales/invoices">
            <Button type="primary">Back to Invoices</Button>
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
          <Link href={`/sales/invoices/${id}`}>
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <Title level={4} style={{ margin: 0 }}>
          Edit Invoice - {invoice.invoiceNumber}
        </Title>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
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
          <Link href={`/sales/invoices/${id}`}>
            <Button>Cancel</Button>
          </Link>
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </Form>
    </div>
  );
}
