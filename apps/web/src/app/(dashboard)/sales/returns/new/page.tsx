'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  Typography,
  Form,
  Input,
  Select,
  Button,
  Space,
  Row,
  Col,
  DatePicker,
  Table,
  InputNumber,
  Switch,
  message,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useCreateSalesReturn, useSalesOrder, useInvoice } from '@/hooks/use-sales';
import { CustomerSelect, ItemSelect, OrderSummary } from '@/components/sales';
import { CreateSalesReturnDto, ReturnReason, ItemCondition } from '@/lib/sales';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ReturnLineItem {
  key: string;
  itemId?: string;
  itemName?: string;
  sku?: string;
  maxQuantity?: number;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  condition: ItemCondition;
  total: number;
}

const reasonOptions = [
  { value: 'DEFECTIVE', label: 'Defective Product' },
  { value: 'WRONG_ITEM', label: 'Wrong Item Shipped' },
  { value: 'CHANGED_MIND', label: 'Changed Mind' },
  { value: 'NOT_AS_DESCRIBED', label: 'Not as Described' },
  { value: 'QUALITY_ISSUE', label: 'Quality Issue' },
  { value: 'DUPLICATE_ORDER', label: 'Duplicate Order' },
  { value: 'OTHER', label: 'Other' },
];

const conditionOptions = [
  { value: 'GOOD', label: 'Good' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'DEFECTIVE', label: 'Defective' },
];

export default function NewSalesReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get('invoiceId');
  const salesOrderId = searchParams.get('salesOrderId');

  const [form] = Form.useForm();
  const createReturn = useCreateSalesReturn();

  const { data: invoice } = useInvoice(invoiceId || '');
  const { data: salesOrder } = useSalesOrder(salesOrderId || '');

  const [lineItems, setLineItems] = useState<ReturnLineItem[]>([
    {
      key: 'item-1',
      quantity: 1,
      unitPrice: 0,
      taxAmount: 0,
      condition: 'GOOD',
      total: 0,
    },
  ]);

  // Pre-populate from invoice or sales order
  useEffect(() => {
    if (invoice) {
      form.setFieldsValue({
        customerId: invoice.customerId,
        invoiceId: invoice.id,
      });
      setLineItems(
        invoice.items.map((item, index) => ({
          key: `item-${index + 1}`,
          itemId: item.itemId,
          itemName: item.item.name,
          sku: item.item.sku,
          maxQuantity: item.quantity,
          quantity: 1,
          unitPrice: item.unitPrice,
          taxAmount: item.taxAmount / item.quantity,
          condition: 'GOOD' as ItemCondition,
          total: item.unitPrice + item.taxAmount / item.quantity,
        }))
      );
    } else if (salesOrder) {
      form.setFieldsValue({
        customerId: salesOrder.customerId,
        salesOrderId: salesOrder.id,
      });
      setLineItems(
        salesOrder.items.map((item, index) => ({
          key: `item-${index + 1}`,
          itemId: item.itemId,
          itemName: item.item.name,
          sku: item.item.sku,
          maxQuantity: item.quantity,
          quantity: 1,
          unitPrice: item.unitPrice,
          taxAmount: item.taxAmount / item.quantity,
          condition: 'GOOD' as ItemCondition,
          total: item.unitPrice + item.taxAmount / item.quantity,
        }))
      );
    }
  }, [invoice, salesOrder, form]);

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = lineItems.reduce((sum, item) => sum + item.quantity * item.taxAmount, 0);
    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    };
  }, [lineItems]);

  const handleItemChange = (
    key: string,
    field: keyof ReturnLineItem,
    value: string | number | undefined
  ) => {
    setLineItems((items) =>
      items.map((item) => {
        if (item.key === key) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice' || field === 'taxAmount') {
            updated.total = updated.quantity * (updated.unitPrice + updated.taxAmount);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleAddItem = () => {
    setLineItems((items) => [
      ...items,
      {
        key: `item-${Date.now()}`,
        quantity: 1,
        unitPrice: 0,
        taxAmount: 0,
        condition: 'GOOD',
        total: 0,
      },
    ]);
  };

  const handleRemoveItem = (key: string) => {
    if (lineItems.length > 1) {
      setLineItems((items) => items.filter((item) => item.key !== key));
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    const validItems = lineItems.filter((item) => item.itemId && item.quantity > 0);
    if (validItems.length === 0) {
      message.error('At least one item is required');
      return;
    }

    const returnData: CreateSalesReturnDto = {
      customerId: values.customerId as string,
      invoiceId: values.invoiceId as string | undefined,
      salesOrderId: values.salesOrderId as string | undefined,
      returnDate: values.returnDate ? (values.returnDate as dayjs.Dayjs).toDate() : undefined,
      reason: values.reason as ReturnReason,
      notes: values.notes as string,
      warehouseId: values.warehouseId as string | undefined,
      restockItems: values.restockItems as boolean,
      items: validItems.map((item) => ({
        itemId: item.itemId!,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxAmount: item.taxAmount,
        condition: item.condition,
      })),
    };

    createReturn.mutate(returnData, {
      onSuccess: (salesReturn) => {
        router.push(`/sales/returns/${salesReturn.id}`);
      },
    });
  };

  const columns = [
    {
      title: 'Item',
      dataIndex: 'itemId',
      key: 'itemId',
      width: 300,
      render: (_: string, record: ReturnLineItem) =>
        record.itemName ? (
          <div>
            <Text strong>{record.itemName}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.sku}
            </Text>
          </div>
        ) : (
          <ItemSelect
            value={record.itemId}
            onChange={(value, option) => {
              handleItemChange(record.key, 'itemId', value);
              if (option && 'label' in option) {
                handleItemChange(
                  record.key,
                  'itemName',
                  (option as unknown as { label: string }).label
                );
              }
            }}
            style={{ width: '100%' }}
          />
        ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (_: number, record: ReturnLineItem) => (
        <InputNumber
          min={1}
          max={record.maxQuantity}
          value={record.quantity}
          onChange={(value) => handleItemChange(record.key, 'quantity', value || 1)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 130,
      render: (_: number, record: ReturnLineItem) => (
        <InputNumber
          min={0}
          precision={2}
          prefix="RM"
          value={record.unitPrice}
          onChange={(value) => handleItemChange(record.key, 'unitPrice', value || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Condition',
      dataIndex: 'condition',
      key: 'condition',
      width: 130,
      render: (_: string, record: ReturnLineItem) => (
        <Select
          value={record.condition}
          onChange={(value) => handleItemChange(record.key, 'condition', value)}
          options={conditionOptions}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right' as const,
      render: (total: number) => `RM ${total.toFixed(2)}`,
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: unknown, record: ReturnLineItem) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveItem(record.key)}
          disabled={lineItems.length === 1}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/sales/returns">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <Title level={4} style={{ margin: 0 }}>
          New Sales Return
        </Title>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          returnDate: dayjs(),
          restockItems: true,
        }}
      >
        <Row gutter={24}>
          <Col span={16}>
            <Card title="Return Details">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="customerId"
                    label="Customer"
                    rules={[{ required: true, message: 'Please select a customer' }]}
                  >
                    <CustomerSelect
                      style={{ width: '100%' }}
                      disabled={!!invoiceId || !!salesOrderId}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="returnDate" label="Return Date">
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    name="reason"
                    label="Return Reason"
                    rules={[{ required: true, message: 'Please select a reason' }]}
                  >
                    <Select options={reasonOptions} placeholder="Select reason" />
                  </Form.Item>
                </Col>
              </Row>

              {invoice && (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="invoiceId" label="Related Invoice">
                      <Input disabled value={invoice.invoiceNumber} />
                    </Form.Item>
                  </Col>
                </Row>
              )}

              {salesOrder && (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="salesOrderId" label="Related Sales Order">
                      <Input disabled value={salesOrder.orderNumber} />
                    </Form.Item>
                  </Col>
                </Row>
              )}
            </Card>

            <Card title="Items to Return" style={{ marginTop: 16 }}>
              <Table
                columns={columns}
                dataSource={lineItems}
                rowKey="key"
                pagination={false}
                size="small"
              />
              {!invoiceId && !salesOrderId && (
                <Button
                  type="dashed"
                  onClick={handleAddItem}
                  icon={<PlusOutlined />}
                  style={{ width: '100%', marginTop: 16 }}
                >
                  Add Item
                </Button>
              )}
            </Card>

            <Card title="Additional Information" style={{ marginTop: 16 }}>
              <Form.Item name="notes" label="Notes">
                <TextArea rows={3} placeholder="Notes about this return" />
              </Form.Item>
            </Card>
          </Col>

          <Col span={8}>
            <Card title="Options">
              <Form.Item
                name="restockItems"
                label="Restock Items"
                valuePropName="checked"
                extra="When items are received, restore them to inventory"
              >
                <Switch />
              </Form.Item>
            </Card>

            <div style={{ marginTop: 16 }}>
              <OrderSummary
                subtotal={totals.subtotal}
                discount={0}
                shipping={0}
                taxAmount={totals.taxAmount}
                total={totals.total}
              />
            </div>
          </Col>
        </Row>

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
          <Link href="/sales/returns">
            <Button>Cancel</Button>
          </Link>
          <Button type="primary" htmlType="submit" loading={createReturn.isPending}>
            Create Return
          </Button>
        </div>
      </Form>
    </div>
  );
}
