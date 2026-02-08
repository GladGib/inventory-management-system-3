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
import { useQuote, useUpdateQuote } from '@/hooks/use-quotes';
import {
  CustomerSelect,
  LineItemsTable,
  LineItem,
  OrderSummary,
  calculateOrderTotals,
} from '@/components/sales';
import { UpdateQuoteDto, DiscountType } from '@/lib/quotes';

const { Title } = Typography;
const { TextArea } = Input;

interface PageProps {
  params: { id: string };
}

export default function EditQuotePage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();
  const [form] = Form.useForm();
  const updateQuote = useUpdateQuote();

  const { data: quote, isLoading, error } = useQuote(id);

  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Populate form and line items when quote loads
  useEffect(() => {
    if (quote) {
      // Check if quote can be edited
      if (quote.status !== 'DRAFT') {
        message.warning('Only draft quotes can be edited');
        router.push(`/sales/quotes/${id}`);
        return;
      }

      form.setFieldsValue({
        customerId: quote.customerId,
        contactPersonName: quote.contactPersonName,
        quoteDate: dayjs(quote.quoteDate),
        validUntil: dayjs(quote.validUntil),
        referenceNumber: quote.referenceNumber,
        warehouseId: quote.warehouseId,
        discountType: quote.discountType || 'PERCENTAGE',
        discountValue: quote.discountValue,
        notes: quote.notes,
        termsConditions: quote.termsConditions,
      });

      setLineItems(
        quote.items.map((item, index) => ({
          key: `item-${index}`,
          itemId: item.itemId,
          itemName: item.item.name,
          itemSku: item.item.sku,
          unit: item.item.unit,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.rate),
          discountPercent: Number(item.discountValue) || 0,
          taxRateId: item.taxRateId,
          taxRate: 0,
          amount: Number(item.amount),
          taxAmount: Number(item.taxAmount),
        }))
      );
    }
  }, [quote, form, router, id]);

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

    const quoteData: UpdateQuoteDto = {
      customerId: values.customerId as string,
      contactPersonName: values.contactPersonName as string,
      validUntil: values.validUntil ? (values.validUntil as dayjs.Dayjs).toDate() : undefined,
      referenceNumber: values.referenceNumber as string,
      warehouseId: values.warehouseId as string,
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

    updateQuote.mutate(
      { id, data: quoteData },
      {
        onSuccess: () => {
          router.push(`/sales/quotes/${id}`);
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

  if (error || !quote) {
    return (
      <Result
        status="404"
        title="Quote not found"
        subTitle="The sales quote you're looking for doesn't exist."
        extra={
          <Link href="/sales/quotes">
            <Button type="primary">Back to Quotes</Button>
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
          <Link href={`/sales/quotes/${id}`}>
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <Title level={4} style={{ margin: 0 }}>
          Edit Quote - {quote.quoteNumber}
        </Title>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
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
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" disabled />
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
          <Link href={`/sales/quotes/${id}`}>
            <Button>Cancel</Button>
          </Link>
          <Button type="primary" htmlType="submit" loading={updateQuote.isPending}>
            Save Changes
          </Button>
        </div>
      </Form>
    </div>
  );
}
