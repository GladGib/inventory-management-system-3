'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Alert,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useCreateVendorPayment, useVendorOpenBills } from '@/hooks/use-purchases';
import { VendorSelect } from '@/components/purchases';
import {
  BillAllocationTable,
  BillAllocation,
  billsToAllocations,
} from '@/components/purchases/BillAllocationTable';
import { CreateVendorPaymentDto } from '@/lib/purchases';

const { Title, Text } = Typography;
const { TextArea } = Input;

const paymentMethods = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'ONLINE_BANKING', label: 'Online Banking' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
];

export default function NewVendorPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vendorIdParam = searchParams.get('vendorId');
  const billIdParam = searchParams.get('billId');

  const [form] = Form.useForm();
  const createPayment = useCreateVendorPayment();

  const [selectedVendorId, setSelectedVendorId] = useState<string | undefined>(
    vendorIdParam || undefined
  );
  const [allocations, setAllocations] = useState<BillAllocation[]>([]);

  const { data: openBills, isLoading: billsLoading } = useVendorOpenBills(selectedVendorId || '');

  const amount = Form.useWatch('amount', form) || 0;

  // Update allocations when bills load
  useEffect(() => {
    if (openBills && openBills.length > 0) {
      const newAllocations = billsToAllocations(openBills);

      // If a specific bill was requested, pre-allocate to it
      if (billIdParam) {
        const targetBill = newAllocations.find((a) => a.billId === billIdParam);
        if (targetBill) {
          targetBill.amount = targetBill.balance;
          form.setFieldValue('amount', targetBill.balance);
        }
      }

      setAllocations(newAllocations);
    } else {
      setAllocations([]);
    }
  }, [openBills, billIdParam, form]);

  const totalAllocated = useMemo(() => {
    return allocations.reduce((sum, a) => sum + (a.amount || 0), 0);
  }, [allocations]);

  const unallocatedAmount = amount - totalAllocated;

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    setAllocations([]);
    form.setFieldValue('amount', 0);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    const validAllocations = allocations.filter((a) => a.amount > 0);

    if (validAllocations.length === 0 && amount > 0) {
      // This is an advance payment - that's okay
    }

    const paymentData: CreateVendorPaymentDto = {
      vendorId: values.vendorId as string,
      paymentDate: values.paymentDate ? (values.paymentDate as dayjs.Dayjs).toDate() : undefined,
      amount: values.amount as number,
      paymentMethod: values.paymentMethod as string,
      referenceNumber: values.referenceNumber as string,
      notes: values.notes as string,
      allocations: validAllocations.map((a) => ({
        billId: a.billId,
        amount: a.amount,
      })),
    };

    createPayment.mutate(paymentData, {
      onSuccess: (payment) => {
        router.push(`/purchases/payments/${payment.id}`);
      },
    });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/purchases/payments">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <Title level={4} style={{ margin: 0 }}>
          Record Vendor Payment
        </Title>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          paymentDate: dayjs(),
          vendorId: vendorIdParam || undefined,
          paymentMethod: 'BANK_TRANSFER',
        }}
      >
        <Row gutter={24}>
          {/* Main Form */}
          <Col span={16}>
            <Card title="Payment Details">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="vendorId"
                    label="Vendor"
                    rules={[{ required: true, message: 'Please select a vendor' }]}
                  >
                    <VendorSelect style={{ width: '100%' }} onChange={handleVendorChange} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="paymentDate"
                    label="Payment Date"
                    rules={[{ required: true, message: 'Please select a date' }]}
                  >
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="amount"
                    label="Payment Amount"
                    rules={[
                      { required: true, message: 'Please enter an amount' },
                      { type: 'number', min: 0.01, message: 'Amount must be greater than 0' },
                    ]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0.01} precision={2} prefix="RM" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="paymentMethod"
                    label="Payment Method"
                    rules={[{ required: true, message: 'Please select a method' }]}
                  >
                    <Select options={paymentMethods} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="referenceNumber" label="Reference #">
                    <Input placeholder="Cheque no. / Transaction ID" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {selectedVendorId && (
              <Card title="Apply to Bills" style={{ marginTop: 16 }}>
                {billsLoading ? (
                  <Text type="secondary">Loading bills...</Text>
                ) : allocations.length === 0 ? (
                  <Alert
                    message="No open bills"
                    description="This vendor has no unpaid bills. This payment will be recorded as an advance."
                    type="info"
                    showIcon
                  />
                ) : (
                  <BillAllocationTable
                    bills={openBills || []}
                    allocations={allocations}
                    onChange={setAllocations}
                    maxAmount={amount}
                  />
                )}
              </Card>
            )}

            <Card title="Additional Information" style={{ marginTop: 16 }}>
              <Form.Item name="notes" label="Notes">
                <TextArea rows={3} placeholder="Payment notes" />
              </Form.Item>
            </Card>
          </Col>

          {/* Sidebar */}
          <Col span={8}>
            <Card title="Payment Summary">
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Payment Amount</Text>
                  <Text strong>RM {amount.toFixed(2)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Allocated to Bills</Text>
                  <Text>RM {totalAllocated.toFixed(2)}</Text>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #f0f0f0',
                    paddingTop: 16,
                  }}
                >
                  <Text strong>Unallocated (Advance)</Text>
                  <Text strong type={unallocatedAmount > 0 ? 'warning' : 'success'}>
                    RM {unallocatedAmount.toFixed(2)}
                  </Text>
                </div>
                {unallocatedAmount > 0 && (
                  <Alert
                    message="Advance Payment"
                    description="The unallocated amount will be recorded as an advance payment."
                    type="warning"
                    showIcon
                  />
                )}
              </Space>
            </Card>
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
          <Link href="/purchases/payments">
            <Button>Cancel</Button>
          </Link>
          <Button type="primary" htmlType="submit" loading={createPayment.isPending}>
            Record Payment
          </Button>
        </div>
      </Form>
    </div>
  );
}
