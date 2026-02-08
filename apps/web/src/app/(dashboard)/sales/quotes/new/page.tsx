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
import { useCreateQuote } from '@/hooks/use-quotes';
import {
  CustomerSelect,
  LineItemsTable,
  LineItem,
  OrderSummary,
  calculateOrderTotals,
} from '@/components/sales';
import { CreateQuoteDto, DiscountType } from '@/lib/quotes';

const { Title } = Typography;
const { TextArea } = Input;

export default function NewQuotePage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const createQuote = useCreateQuote();

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

    const quoteData: CreateQuoteDto = {
      customerId: values.customerId as string,
      contactPersonName: values.contactPersonName as string,
      quoteDate: values.quoteDate ? (values.quoteDate as dayjs.Dayjs).toDate() : undefined,
      validUntil: (values.validUntil as dayjs.Dayjs).toDate(),
      warehouseId: values.warehouseId as string,
      referenceNumber: values.referenceNumber as string,
      discountType: values.discountType as DiscountType,
      discountValue: values.discountValue as number,
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

    createQuote.mutate(quoteData, {
      onSuccess: (quote) => {
        router.push(`/sales/quotes/${quote.id}`);
      },
    });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/sales/quotes">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <Title level={4} style={{ margin: 0 }}>
          New Sales Quote
        </Title>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          quoteDate: dayjs(),
          validUntil: dayjs().add(30, 'day'),
          discountType: 'PERCENTAGE',
        }}
      >
        <Row gutter={24}>
          {/* Main Form */}
          <Col span={16}>
            <Card title="Quote Details">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="customerId"
                    label="Customer"
                  >
                    <CustomerSelect style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="contactPersonName" label="Contact Person">
                    <Input placeholder="Contact person name" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item name="quoteDate" label="Quote Date">
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    name="validUntil"
                    label="Valid Until"
                    rules={[{ required: true, message: 'Please select validity date' }]}
                  >
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="referenceNumber" label="Reference #">
                    <Input placeholder="Reference number" />
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
          <Link href="/sales/quotes">
            <Button>Cancel</Button>
          </Link>
          <Button type="primary" htmlType="submit" loading={createQuote.isPending}>
            Create Quote
          </Button>
        </div>
      </Form>
    </div>
  );
}
