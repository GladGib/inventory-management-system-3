'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  Typography,
  Form,
  Input,
  Button,
  Space,
  Row,
  Col,
  DatePicker,
  Table,
  InputNumber,
  message,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useCreateVendorCredit } from '@/hooks/use-purchases';
import { VendorSelect, PurchaseOrderSummary } from '@/components/purchases';
import { CreateVendorCreditDto } from '@/lib/purchases';

const { Title } = Typography;
const { TextArea } = Input;

interface CreditLineItem {
  key: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  total: number;
}

export default function NewVendorCreditPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const createCredit = useCreateVendorCredit();

  const [lineItems, setLineItems] = useState<CreditLineItem[]>([
    {
      key: 'item-1',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxAmount: 0,
      total: 0,
    },
  ]);

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    };
  }, [lineItems]);

  const handleItemChange = (key: string, field: keyof CreditLineItem, value: string | number) => {
    setLineItems((items) =>
      items.map((item) => {
        if (item.key === key) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            updated.total = updated.quantity * updated.unitPrice + updated.taxAmount;
          }
          if (field === 'taxAmount') {
            updated.total = updated.quantity * updated.unitPrice + (value as number);
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
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxAmount: 0,
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
    const validItems = lineItems.filter((item) => item.description && item.quantity > 0);
    if (validItems.length === 0) {
      message.error('At least one item with description is required');
      return;
    }

    const creditData: CreateVendorCreditDto = {
      vendorId: values.vendorId as string,
      creditDate: values.creditDate ? (values.creditDate as dayjs.Dayjs).toDate() : undefined,
      notes: values.notes as string,
      items: validItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxAmount: item.taxAmount,
      })),
    };

    createCredit.mutate(creditData, {
      onSuccess: (credit) => {
        router.push(`/purchases/credits/${credit.id}`);
      },
    });
  };

  const columns = [
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (_: string, record: CreditLineItem) => (
        <Input
          value={record.description}
          onChange={(e) => handleItemChange(record.key, 'description', e.target.value)}
          placeholder="Item description"
        />
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (_: number, record: CreditLineItem) => (
        <InputNumber
          min={1}
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
      width: 140,
      render: (_: number, record: CreditLineItem) => (
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
      title: 'Tax',
      dataIndex: 'taxAmount',
      key: 'taxAmount',
      width: 120,
      render: (_: number, record: CreditLineItem) => (
        <InputNumber
          min={0}
          precision={2}
          prefix="RM"
          value={record.taxAmount}
          onChange={(value) => handleItemChange(record.key, 'taxAmount', value || 0)}
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
      render: (_: unknown, record: CreditLineItem) => (
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
          <Link href="/purchases/credits">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <Title level={4} style={{ margin: 0 }}>
          New Vendor Credit
        </Title>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          creditDate: dayjs(),
        }}
      >
        <Row gutter={24}>
          <Col span={16}>
            <Card title="Credit Details">
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
                  <Form.Item name="creditDate" label="Credit Date">
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Credit Items" style={{ marginTop: 16 }}>
              <Table
                columns={columns}
                dataSource={lineItems}
                rowKey="key"
                pagination={false}
                size="small"
              />
              <Button
                type="dashed"
                onClick={handleAddItem}
                icon={<PlusOutlined />}
                style={{ width: '100%', marginTop: 16 }}
              >
                Add Item
              </Button>
            </Card>

            <Card title="Additional Information" style={{ marginTop: 16 }}>
              <Form.Item name="notes" label="Notes">
                <TextArea rows={3} placeholder="Notes about this credit" />
              </Form.Item>
            </Card>
          </Col>

          <Col span={8}>
            <PurchaseOrderSummary
              subtotal={totals.subtotal}
              discount={0}
              shipping={0}
              taxAmount={totals.taxAmount}
              total={totals.total}
            />
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
          <Link href="/purchases/credits">
            <Button>Cancel</Button>
          </Link>
          <Button type="primary" htmlType="submit" loading={createCredit.isPending}>
            Create Credit
          </Button>
        </div>
      </Form>
    </div>
  );
}
