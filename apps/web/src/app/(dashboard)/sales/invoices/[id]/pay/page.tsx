'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dayjs from 'dayjs';
import {
  Card,
  Typography,
  Button,
  Space,
  Tag,
  Descriptions,
  Divider,
  Spin,
  Result,
  Select,
  Alert,
  Steps,
} from 'antd';
import {
  ArrowLeftOutlined,
  BankOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import { useInvoice } from '@/hooks/use-sales';
import { useBankList, useInitiatePayment, useOnlinePaymentStatus } from '@/hooks/use-online-payments';
import type { PaymentGateway } from '@/lib/online-payments';

const { Title, Text, Paragraph } = Typography;

interface PageProps {
  params: { id: string };
}

const statusColors: Record<string, string> = {
  PENDING: 'processing',
  PROCESSING: 'processing',
  COMPLETED: 'success',
  FAILED: 'error',
  EXPIRED: 'default',
  REFUNDED: 'warning',
};

export default function InvoicePaymentPage({ params }: PageProps) {
  const { id: invoiceId } = params;
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if returning from payment redirect
  const redirectStatus = searchParams.get('status');
  const paymentRef = searchParams.get('ref');
  const paymentIdParam = searchParams.get('paymentId');

  const [selectedGateway] = useState<PaymentGateway>('FPX');
  const [selectedBank, setSelectedBank] = useState<string | undefined>();
  const [currentStep, setCurrentStep] = useState(redirectStatus === 'redirect' ? 2 : 0);
  const [paymentId, setPaymentId] = useState<string | undefined>(paymentIdParam || undefined);

  // Queries
  const { data: invoice, isLoading: invoiceLoading, error: invoiceError } = useInvoice(invoiceId);
  const { data: banks, isLoading: banksLoading } = useBankList(selectedGateway);
  const initiatePayment = useInitiatePayment();

  // Poll payment status if we have a paymentId and are in the status-checking phase
  const shouldPollStatus = currentStep === 2 && !!paymentId;
  const {
    data: paymentStatus,
    isLoading: statusLoading,
  } = useOnlinePaymentStatus(paymentId || '', {
    enabled: shouldPollStatus,
    refetchInterval: shouldPollStatus ? 3000 : undefined,
  });

  // Automatically advance step when payment completes or fails
  useEffect(() => {
    if (paymentStatus) {
      if (paymentStatus.status === 'COMPLETED') {
        setCurrentStep(3);
      } else if (paymentStatus.status === 'FAILED' || paymentStatus.status === 'EXPIRED') {
        setCurrentStep(3);
      }
    }
  }, [paymentStatus]);

  const handleInitiatePayment = async () => {
    if (!selectedBank) return;

    try {
      const result = await initiatePayment.mutateAsync({
        gateway: selectedGateway,
        invoiceId,
        bankCode: selectedBank,
        buyerEmail: invoice?.customer?.email || undefined,
        buyerName: invoice?.customer?.displayName || undefined,
      });

      setPaymentId(result.paymentId);
      setCurrentStep(2);

      // Redirect to the payment gateway
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
      }
    } catch {
      // Error is handled by the mutation hook
    }
  };

  // Loading state
  if (invoiceLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <Paragraph style={{ marginTop: 16 }} type="secondary">
          Loading invoice details...
        </Paragraph>
      </div>
    );
  }

  // Error state
  if (invoiceError || !invoice) {
    return (
      <Result
        status="404"
        title="Invoice not found"
        subTitle="The invoice you are trying to pay does not exist."
        extra={
          <Link href="/sales/invoices">
            <Button type="primary">Back to Invoices</Button>
          </Link>
        }
      />
    );
  }

  // Already paid
  if (invoice.status === 'PAID') {
    return (
      <Result
        status="success"
        title="Invoice Already Paid"
        subTitle={`Invoice ${invoice.invoiceNumber} has been fully paid.`}
        extra={
          <Link href={`/sales/invoices/${invoiceId}`}>
            <Button type="primary">View Invoice</Button>
          </Link>
        }
      />
    );
  }

  // Voided
  if (invoice.status === 'VOID') {
    return (
      <Result
        status="warning"
        title="Invoice Voided"
        subTitle={`Invoice ${invoice.invoiceNumber} has been voided and cannot be paid.`}
        extra={
          <Link href="/sales/invoices">
            <Button type="primary">Back to Invoices</Button>
          </Link>
        }
      />
    );
  }

  const balance = Number(invoice.balance);

  // Payment completed result
  if (currentStep === 3 && paymentStatus) {
    const isSuccess = paymentStatus.status === 'COMPLETED';

    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 0' }}>
        <Result
          status={isSuccess ? 'success' : 'error'}
          title={isSuccess ? 'Payment Successful' : 'Payment Failed'}
          subTitle={
            isSuccess
              ? `RM ${Number(paymentStatus.amount).toFixed(2)} has been paid for invoice ${invoice.invoiceNumber}`
              : paymentStatus.errorMessage || 'The payment was not completed. Please try again.'
          }
          extra={[
            <Link key="invoice" href={`/sales/invoices/${invoiceId}`}>
              <Button type="primary">View Invoice</Button>
            </Link>,
            !isSuccess && (
              <Button
                key="retry"
                onClick={() => {
                  setCurrentStep(0);
                  setPaymentId(undefined);
                  setSelectedBank(undefined);
                }}
              >
                Try Again
              </Button>
            ),
          ].filter(Boolean)}
        />
        {paymentStatus.referenceNumber && (
          <Card style={{ marginTop: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Reference Number">
                <Text copyable>{paymentStatus.referenceNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Gateway">
                {paymentStatus.gateway}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColors[paymentStatus.status]}>
                  {paymentStatus.status}
                </Tag>
              </Descriptions.Item>
              {paymentStatus.gatewayRef && (
                <Descriptions.Item label="Gateway Reference">
                  {paymentStatus.gatewayRef}
                </Descriptions.Item>
              )}
              {paymentStatus.completedAt && (
                <Descriptions.Item label="Completed At">
                  {dayjs(paymentStatus.completedAt).format('DD/MM/YYYY HH:mm:ss')}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href={`/sales/invoices/${invoiceId}`}>
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back to Invoice
            </Button>
          </Link>
        </Space>
        <Title level={4} style={{ margin: 0 }}>
          Pay Invoice {invoice.invoiceNumber}
        </Title>
      </div>

      {/* Progress Steps */}
      <Card style={{ marginBottom: 24 }}>
        <Steps
          current={currentStep}
          items={[
            {
              title: 'Select Bank',
              icon: <BankOutlined />,
            },
            {
              title: 'Confirm Payment',
              icon: <CreditCardOutlined />,
            },
            {
              title: 'Processing',
              icon: currentStep === 2 ? <LoadingOutlined /> : undefined,
            },
            {
              title: 'Complete',
              icon: paymentStatus?.status === 'COMPLETED'
                ? <CheckCircleOutlined />
                : paymentStatus?.status === 'FAILED'
                  ? <CloseCircleOutlined />
                  : undefined,
            },
          ]}
        />
      </Card>

      {/* Invoice Summary */}
      <Card title="Invoice Summary" style={{ marginBottom: 24 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="Invoice Number">
            <Text strong>{invoice.invoiceNumber}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Customer">
            {invoice.customer.displayName}
          </Descriptions.Item>
          <Descriptions.Item label="Invoice Date">
            {dayjs(invoice.invoiceDate).format('DD/MM/YYYY')}
          </Descriptions.Item>
          <Descriptions.Item label="Due Date">
            {dayjs(invoice.dueDate).format('DD/MM/YYYY')}
          </Descriptions.Item>
          <Descriptions.Item label="Total Amount">
            <Text strong>RM {Number(invoice.total).toFixed(2)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Amount Paid">
            <Text type="success">RM {Number(invoice.amountPaid).toFixed(2)}</Text>
          </Descriptions.Item>
        </Descriptions>
        <Divider />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 16 }}>Amount to Pay</Text>
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            RM {balance.toFixed(2)}
          </Title>
        </div>
      </Card>

      {/* Step 0: Bank Selection */}
      {currentStep === 0 && (
        <Card title="Select Your Bank (FPX)" style={{ marginBottom: 24 }}>
          <Alert
            message="Secure Online Banking"
            description="You will be redirected to your bank's secure portal to authorize the payment. FPX is Malaysia's national payment gateway."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <div style={{ marginBottom: 24 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Choose your bank:
            </Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Select a bank"
              size="large"
              loading={banksLoading}
              value={selectedBank}
              onChange={(value) => setSelectedBank(value)}
              showSearch
              optionFilterProp="label"
              options={(banks || []).map((bank) => ({
                value: bank.code,
                label: bank.name,
                disabled: !bank.active,
              }))}
            />
          </div>

          <Button
            type="primary"
            size="large"
            block
            disabled={!selectedBank}
            onClick={() => setCurrentStep(1)}
          >
            Continue
          </Button>
        </Card>
      )}

      {/* Step 1: Confirm Payment */}
      {currentStep === 1 && (
        <Card title="Confirm Payment" style={{ marginBottom: 24 }}>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Payment Method">
              <Space>
                <BankOutlined />
                <Text>FPX Online Banking</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Selected Bank">
              <Text strong>
                {banks?.find((b) => b.code === selectedBank)?.name || selectedBank}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Amount">
              <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                RM {balance.toFixed(2)}
              </Title>
            </Descriptions.Item>
            <Descriptions.Item label="Invoice">
              {invoice.invoiceNumber}
            </Descriptions.Item>
          </Descriptions>

          <Alert
            message="Important"
            description="After clicking 'Pay Now', you will be redirected to your bank's website to complete the payment. Do not close the browser during the process."
            type="warning"
            showIcon
            style={{ marginTop: 24, marginBottom: 24 }}
          />

          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button onClick={() => setCurrentStep(0)}>Back</Button>
            <Button
              type="primary"
              size="large"
              icon={<CreditCardOutlined />}
              loading={initiatePayment.isPending}
              onClick={handleInitiatePayment}
            >
              Pay Now - RM {balance.toFixed(2)}
            </Button>
          </Space>
        </Card>
      )}

      {/* Step 2: Processing */}
      {currentStep === 2 && (
        <Card style={{ marginBottom: 24, textAlign: 'center', padding: '48px 24px' }}>
          <Spin size="large" />
          <Title level={4} style={{ marginTop: 24 }}>
            Payment Processing
          </Title>
          <Paragraph type="secondary">
            {paymentRef
              ? 'Your payment is being processed. Please wait...'
              : 'Redirecting to your bank...'}
          </Paragraph>
          {paymentRef && (
            <Paragraph type="secondary" style={{ fontSize: 12 }}>
              Reference: {paymentRef}
            </Paragraph>
          )}
          {statusLoading && (
            <Paragraph type="secondary" style={{ fontSize: 12 }}>
              Checking payment status...
            </Paragraph>
          )}
        </Card>
      )}
    </div>
  );
}
