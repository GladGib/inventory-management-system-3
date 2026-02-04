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
import { useBill, useUpdateBill } from '@/hooks/use-purchases';
import {
  VendorSelect,
  PurchaseLineItemsTable,
  PurchaseLineItem,
  PurchaseOrderSummary,
  calculatePurchaseOrderTotals,
} from '@/components/purchases';
import { CreateBillDto } from '@/lib/purchases';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function EditBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [form] = Form.useForm();

  const { data: bill, isLoading } = useBill(id);
  const updateBill = useUpdateBill();

  const [lineItems, setLineItems] = useState<PurchaseLineItem[]>([]);

  // Initialize form when bill loads
  useEffect(() => {
    if (bill) {
      form.setFieldsValue({
        vendorId: bill.vendorId,
        vendorInvoiceNumber: bill.vendorInvoiceNumber,
        billDate: dayjs(bill.billDate),
        dueDate: dayjs(bill.dueDate),
        discountAmount: bill.discount,
        notes: '',
      });

      // Convert bill items to line items
      setLineItems(
        bill.items.map((item, index) => ({
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
  }, [bill, form]);

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

    updateBill.mutate(
      { id, data: billData },
      {
        onSuccess: () => {
          router.push(`/purchases/bills/${id}`);
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

  if (!bill) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Text>Bill not found</Text>
      </div>
    );
  }

  if (bill.status !== 'DRAFT') {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Text>Only draft bills can be edited</Text>
        <br />
        <Link href={`/purchases/bills/${id}`}>
          <Button type="primary" style={{ marginTop: 16 }}>
            View Bill
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
          <Link href={`/purchases/bills/${id}`}>
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <Title level={4} style={{ margin: 0 }}>
          Edit {bill.billNumber}
        </Title>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
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
          <Link href={`/purchases/bills/${id}`}>
            <Button>Cancel</Button>
          </Link>
          <Button type="primary" htmlType="submit" loading={updateBill.isPending}>
            Save Changes
          </Button>
        </div>
      </Form>
    </div>
  );
}
