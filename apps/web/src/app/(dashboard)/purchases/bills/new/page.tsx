'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { useCreateBill } from '@/hooks/use-purchases';
import {
  VendorSelect,
  PurchaseLineItemsTable,
  PurchaseLineItem,
  PurchaseOrderSummary,
  calculatePurchaseOrderTotals,
} from '@/components/purchases';
import { CreateBillDto } from '@/lib/purchases';

const { Title } = Typography;
const { TextArea } = Input;

export default function NewBillPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vendorIdParam = searchParams.get('vendorId');

  const [form] = Form.useForm();
  const createBill = useCreateBill();

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

  const totals = useMemo(() => {
    return calculatePurchaseOrderTotals(lineItems, discountAmount, 0);
  }, [lineItems, discountAmount]);

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

    const billData: CreateBillDto = {
      vendorId: values.vendorId as string,
      billDate: values.billDate ? (values.billDate as dayjs.Dayjs).toDate() : undefined,
      dueDate: values.dueDate ? (values.dueDate as dayjs.Dayjs).toDate() : undefined,
      discountAmount: values.discountAmount as number,
      vendorInvoiceNumber: values.vendorInvoiceNumber as string,
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

    createBill.mutate(billData, {
      onSuccess: (bill) => {
        router.push(`/purchases/bills/${bill.id}`);
      },
    });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/purchases/bills">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <Title level={4} style={{ margin: 0 }}>
          New Bill
        </Title>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          billDate: dayjs(),
          dueDate: dayjs().add(30, 'day'),
          vendorId: vendorIdParam || undefined,
        }}
      >
        <Row gutter={24}>
          {/* Main Form */}
          <Col span={16}>
            <Card title="Bill Details">
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
                <Col span={12}>
                  <Form.Item name="vendorInvoiceNumber" label="Vendor Invoice #">
                    <Input placeholder="Vendor's invoice number" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="billDate"
                    label="Bill Date"
                    rules={[{ required: true, message: 'Please select a date' }]}
                  >
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="dueDate"
                    label="Due Date"
                    rules={[{ required: true, message: 'Please select a due date' }]}
                  >
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
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
                <TextArea rows={3} placeholder="Internal notes" />
              </Form.Item>
            </Card>
          </Col>

          {/* Sidebar */}
          <Col span={8}>
            <Card title="Discount">
              <Form.Item name="discountAmount" label="Discount Amount">
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
          <Link href="/purchases/bills">
            <Button>Cancel</Button>
          </Link>
          <Button type="primary" htmlType="submit" loading={createBill.isPending}>
            Create Bill
          </Button>
        </div>
      </Form>
    </div>
  );
}
