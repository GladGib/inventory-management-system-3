'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
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
  Table,
  Alert,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useCreatePayment, useInvoices } from '@/hooks/use-sales';
import { CustomerSelect } from '@/components/sales';
import { CreatePaymentDto } from '@/lib/sales';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface AllocationRow {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  total: number;
  balance: number;
  allocatedAmount: number;
}

function NewPaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedInvoiceId = searchParams.get('invoiceId');

  const [form] = Form.useForm();
  const createPayment = useCreatePayment();

  const customerId = Form.useWatch('customerId', form);
  const paymentAmount = Form.useWatch('amount', form) || 0;

  const [allocations, setAllocations] = useState<AllocationRow[]>([]);

  // Fetch unpaid invoices for selected customer
  const { data: invoicesData, isLoading: loadingInvoices } = useInvoices({
    customerId: customerId || undefined,
    status: undefined, // Get all to filter unpaid
    limit: 100,
  });

  // Filter to unpaid invoices and build allocation rows
  useEffect(() => {
    if (invoicesData?.data) {
      const unpaidInvoices = invoicesData.data.filter(
        (inv) => Number(inv.balance) > 0 && !['VOID', 'PAID'].includes(inv.status)
      );

      const rows: AllocationRow[] = unpaidInvoices.map((inv) => ({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        total: Number(inv.total),
        balance: Number(inv.balance),
        allocatedAmount: 0,
      }));

      // Sort by due date (oldest first)
      rows.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

      // If preselected invoice, set its allocation
      if (preselectedInvoiceId) {
        const preselected = rows.find((r) => r.invoiceId === preselectedInvoiceId);
        if (preselected) {
          preselected.allocatedAmount = Math.min(
            preselected.balance,
            paymentAmount || preselected.balance
          );
        }
      }

      setAllocations(rows);
    }
  }, [invoicesData?.data, preselectedInvoiceId, paymentAmount]);

  const totalAllocated = useMemo(() => {
    return allocations.reduce((sum, row) => sum + row.allocatedAmount, 0);
  }, [allocations]);

  const remainingToAllocate = paymentAmount - totalAllocated;

  const handleAllocationChange = (invoiceId: string, amount: number) => {
    setAllocations((prev) =>
      prev.map((row) =>
        row.invoiceId === invoiceId
          ? { ...row, allocatedAmount: Math.min(amount, row.balance) }
          : row
      )
    );
  };

  const handleAutoAllocate = () => {
    let remaining = paymentAmount;
    const newAllocations = allocations.map((row) => {
      if (remaining <= 0) {
        return { ...row, allocatedAmount: 0 };
      }
      const toAllocate = Math.min(remaining, row.balance);
      remaining -= toAllocate;
      return { ...row, allocatedAmount: toAllocate };
    });
    setAllocations(newAllocations);
  };

  const handleClearAllocations = () => {
    setAllocations((prev) => prev.map((row) => ({ ...row, allocatedAmount: 0 })));
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    // Validate allocations
    const validAllocations = allocations.filter((a) => a.allocatedAmount > 0);

    if (validAllocations.length === 0) {
      form.setFields([
        {
          name: 'allocations',
          errors: ['At least one invoice must be allocated'],
        },
      ]);
      return;
    }

    if (Math.abs(totalAllocated - paymentAmount) > 0.01) {
      form.setFields([
        {
          name: 'allocations',
          errors: [
            `Total allocations (RM ${totalAllocated.toFixed(2)}) must equal payment amount (RM ${paymentAmount.toFixed(2)})`,
          ],
        },
      ]);
      return;
    }

    const paymentData: CreatePaymentDto = {
      customerId: values.customerId as string,
      paymentDate: values.paymentDate ? (values.paymentDate as dayjs.Dayjs).toDate() : undefined,
      amount: values.amount as number,
      paymentMethod: values.paymentMethod as string,
      referenceNumber: values.referenceNumber as string,
      notes: values.notes as string,
      allocations: validAllocations.map((a) => ({
        invoiceId: a.invoiceId,
        amount: a.allocatedAmount,
      })),
    };

    createPayment.mutate(paymentData, {
      onSuccess: (payment) => {
        router.push(`/sales/payments/${payment.id}`);
      },
    });
  };

  const allocationColumns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 120,
    },
    {
      title: 'Date',
      dataIndex: 'invoiceDate',
      key: 'invoiceDate',
      width: 100,
      render: (date: string) => dayjs(date).format('DD/MM/YY'),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 100,
      render: (date: string) => {
        const isOverdue = dayjs(date).isBefore(dayjs());
        return (
          <Text type={isOverdue ? 'danger' : undefined}>{dayjs(date).format('DD/MM/YY')}</Text>
        );
      },
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 100,
      align: 'right' as const,
      render: (val: number) => `RM ${val.toFixed(2)}`,
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      width: 100,
      align: 'right' as const,
      render: (val: number) => <Text type="danger">RM {val.toFixed(2)}</Text>,
    },
    {
      title: 'Allocate',
      dataIndex: 'allocatedAmount',
      key: 'allocatedAmount',
      width: 130,
      render: (_: unknown, record: AllocationRow) => (
        <InputNumber
          value={record.allocatedAmount}
          onChange={(val) => handleAllocationChange(record.invoiceId, val || 0)}
          min={0}
          max={record.balance}
          precision={2}
          prefix="RM"
          style={{ width: '100%' }}
        />
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/sales/payments">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <Title level={4} style={{ margin: 0 }}>
          Record Payment
        </Title>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          paymentDate: dayjs(),
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
                    name="customerId"
                    label="Customer"
                    rules={[{ required: true, message: 'Please select a customer' }]}
                  >
                    <CustomerSelect style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="paymentDate" label="Payment Date">
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    name="amount"
                    label="Amount"
                    rules={[{ required: true, message: 'Please enter amount' }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0.01} precision={2} prefix="RM" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="paymentMethod"
                    label="Payment Method"
                    rules={[{ required: true, message: 'Please select payment method' }]}
                  >
                    <Select>
                      <Select.Option value="CASH">Cash</Select.Option>
                      <Select.Option value="BANK_TRANSFER">Bank Transfer</Select.Option>
                      <Select.Option value="CHECK">Check</Select.Option>
                      <Select.Option value="CREDIT_CARD">Credit Card</Select.Option>
                      <Select.Option value="OTHER">Other</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="referenceNumber" label="Reference Number">
                    <Input placeholder="Check number, bank reference, etc." />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="notes" label="Notes">
                <TextArea rows={2} placeholder="Payment notes" />
              </Form.Item>
            </Card>

            <Card
              title="Invoice Allocation"
              style={{ marginTop: 16 }}
              extra={
                <Space>
                  <Button size="small" onClick={handleAutoAllocate} disabled={!paymentAmount}>
                    Auto-allocate
                  </Button>
                  <Button size="small" onClick={handleClearAllocations}>
                    Clear All
                  </Button>
                </Space>
              }
            >
              {!customerId ? (
                <Alert message="Select a customer to view unpaid invoices" type="info" />
              ) : loadingInvoices ? (
                <Text type="secondary">Loading invoices...</Text>
              ) : allocations.length === 0 ? (
                <Alert message="No unpaid invoices for this customer" type="info" />
              ) : (
                <>
                  <Form.Item name="allocations" noStyle>
                    <Table
                      columns={allocationColumns}
                      dataSource={allocations}
                      rowKey="invoiceId"
                      pagination={false}
                      size="small"
                      scroll={{ y: 300 }}
                    />
                  </Form.Item>
                </>
              )}
            </Card>
          </Col>

          {/* Sidebar */}
          <Col span={8}>
            <Card title="Payment Summary">
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Payment Amount</Text>
                  <Text strong>RM {paymentAmount.toFixed(2)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Total Allocated</Text>
                  <Text type={totalAllocated > 0 ? 'success' : undefined}>
                    RM {totalAllocated.toFixed(2)}
                  </Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Remaining</Text>
                  <Text type={remainingToAllocate !== 0 ? 'danger' : 'success'}>
                    RM {remainingToAllocate.toFixed(2)}
                  </Text>
                </div>

                {remainingToAllocate !== 0 && paymentAmount > 0 && (
                  <Alert
                    message={
                      remainingToAllocate > 0
                        ? `RM ${remainingToAllocate.toFixed(2)} remaining to allocate`
                        : `Over-allocated by RM ${Math.abs(remainingToAllocate).toFixed(2)}`
                    }
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
          <Link href="/sales/payments">
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

export default function NewPaymentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewPaymentPageContent />
    </Suspense>
  );
}
