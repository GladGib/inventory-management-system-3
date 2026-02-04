'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dayjs from 'dayjs';
import {
  Card,
  Typography,
  Descriptions,
  Table,
  Tag,
  Button,
  Space,
  Spin,
  Row,
  Col,
  Statistic,
  Modal,
  InputNumber,
  message,
} from 'antd';
import { ArrowLeftOutlined, DollarOutlined } from '@ant-design/icons';
import { useCreditNote, useApplyCreditNote, useInvoices } from '@/hooks/use-sales';
import { CreditNoteStatus, CreditNoteApplication, Invoice } from '@/lib/sales';

const { Title, Text } = Typography;

const statusColors: Record<CreditNoteStatus, string> = {
  OPEN: 'blue',
  PARTIALLY_APPLIED: 'orange',
  FULLY_APPLIED: 'green',
  VOID: 'red',
};

interface AllocationRow {
  invoiceId: string;
  invoiceNumber: string;
  invoiceTotal: number;
  balance: number;
  amount: number;
}

export default function CreditNoteDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const showApply = searchParams.get('apply') === 'true';

  const { data: creditNote, isLoading, error } = useCreditNote(id);
  const applyCreditNote = useApplyCreditNote();

  const [applyModalOpen, setApplyModalOpen] = useState(showApply);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);

  // Fetch customer's open invoices when modal opens
  const { data: invoicesData } = useInvoices({
    customerId: creditNote?.customerId,
    status: 'SENT',
  });

  useEffect(() => {
    if (invoicesData?.data && creditNote) {
      const openInvoices = invoicesData.data.filter((inv: Invoice) => inv.balance > 0);
      setAllocations(
        openInvoices.map((inv: Invoice) => ({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceTotal: inv.total,
          balance: inv.balance,
          amount: 0,
        }))
      );
    }
  }, [invoicesData, creditNote]);

  const handleAllocationChange = (invoiceId: string, amount: number) => {
    setAllocations((prev) => prev.map((a) => (a.invoiceId === invoiceId ? { ...a, amount } : a)));
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const remainingBalance = (creditNote?.balance || 0) - totalAllocated;

  const handleApply = () => {
    const validAllocations = allocations.filter((a) => a.amount > 0);
    if (validAllocations.length === 0) {
      message.error('Please enter at least one allocation amount');
      return;
    }

    if (totalAllocated > (creditNote?.balance || 0)) {
      message.error('Total allocation exceeds credit note balance');
      return;
    }

    applyCreditNote.mutate(
      {
        id,
        data: {
          applications: validAllocations.map((a) => ({
            invoiceId: a.invoiceId,
            amount: a.amount,
          })),
        },
      },
      {
        onSuccess: () => {
          setApplyModalOpen(false);
          router.push(`/sales/credit-notes/${id}`);
        },
      }
    );
  };

  const itemColumns = [
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'center' as const,
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      align: 'right' as const,
      render: (price: number) => `RM ${Number(price).toFixed(2)}`,
    },
    {
      title: 'Tax',
      dataIndex: 'taxAmount',
      key: 'taxAmount',
      width: 100,
      align: 'right' as const,
      render: (tax: number) => `RM ${Number(tax).toFixed(2)}`,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right' as const,
      render: (total: number) => `RM ${Number(total).toFixed(2)}`,
    },
  ];

  const applicationColumns = [
    {
      title: 'Invoice',
      dataIndex: ['invoice', 'invoiceNumber'],
      key: 'invoice',
      render: (_: string, record: CreditNoteApplication) => (
        <Link href={`/sales/invoices/${record.invoiceId}`}>{record.invoice.invoiceNumber}</Link>
      ),
    },
    {
      title: 'Invoice Total',
      dataIndex: ['invoice', 'total'],
      key: 'invoiceTotal',
      width: 120,
      align: 'right' as const,
      render: (total: number) => `RM ${Number(total).toFixed(2)}`,
    },
    {
      title: 'Amount Applied',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      align: 'right' as const,
      render: (amount: number) => `RM ${Number(amount).toFixed(2)}`,
    },
    {
      title: 'Applied Date',
      dataIndex: 'appliedDate',
      key: 'appliedDate',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
  ];

  const allocationColumns = [
    {
      title: 'Invoice',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
    },
    {
      title: 'Invoice Total',
      dataIndex: 'invoiceTotal',
      key: 'invoiceTotal',
      width: 130,
      align: 'right' as const,
      render: (total: number) => `RM ${Number(total).toFixed(2)}`,
    },
    {
      title: 'Balance Due',
      dataIndex: 'balance',
      key: 'balance',
      width: 130,
      align: 'right' as const,
      render: (balance: number) => `RM ${Number(balance).toFixed(2)}`,
    },
    {
      title: 'Amount to Apply',
      key: 'amount',
      width: 150,
      render: (_: unknown, record: AllocationRow) => (
        <InputNumber
          min={0}
          max={Math.min(record.balance, creditNote?.balance || 0)}
          precision={2}
          prefix="RM"
          value={record.amount}
          onChange={(value) => handleAllocationChange(record.invoiceId, value || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !creditNote) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Text type="danger">Failed to load credit note</Text>
        <br />
        <Link href="/sales/credit-notes">
          <Button type="primary" style={{ marginTop: 16 }}>
            Back to Credit Notes
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/sales/credit-notes">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space align="center">
            <Title level={4} style={{ margin: 0 }}>
              {creditNote.creditNumber}
            </Title>
            <Tag color={statusColors[creditNote.status]}>{creditNote.status.replace('_', ' ')}</Tag>
          </Space>
          {(creditNote.status === 'OPEN' || creditNote.status === 'PARTIALLY_APPLIED') && (
            <Button
              type="primary"
              icon={<DollarOutlined />}
              onClick={() => setApplyModalOpen(true)}
            >
              Apply to Invoice
            </Button>
          )}
        </div>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          <Card title="Credit Note Details">
            <Descriptions column={2}>
              <Descriptions.Item label="Customer">
                <Link href={`/contacts/customers/${creditNote.customerId}`}>
                  {creditNote.customer.displayName}
                </Link>
              </Descriptions.Item>
              <Descriptions.Item label="Date">
                {dayjs(creditNote.creditDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              {creditNote.notes && (
                <Descriptions.Item label="Notes" span={2}>
                  {creditNote.notes}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Card title="Items" style={{ marginTop: 16 }}>
            <Table
              columns={itemColumns}
              dataSource={creditNote.items}
              rowKey="id"
              pagination={false}
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={4} align="right">
                      <strong>Subtotal</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <strong>RM {Number(creditNote.subtotal).toFixed(2)}</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={4} align="right">
                      Tax
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      RM {Number(creditNote.taxAmount).toFixed(2)}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={4} align="right">
                      <strong>Total</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <strong style={{ fontSize: 16 }}>
                        RM {Number(creditNote.total).toFixed(2)}
                      </strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>

          {creditNote.applications && creditNote.applications.length > 0 && (
            <Card title="Application History" style={{ marginTop: 16 }}>
              <Table
                columns={applicationColumns}
                dataSource={creditNote.applications}
                rowKey="id"
                pagination={false}
              />
            </Card>
          )}
        </Col>

        <Col span={8}>
          <Card title="Summary">
            <Statistic
              title="Credit Note Total"
              value={Number(creditNote.total).toFixed(2)}
              prefix="RM"
              valueStyle={{ fontSize: 28, fontWeight: 600 }}
            />
            <div style={{ marginTop: 24 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="Applied"
                    value={Number(creditNote.total - creditNote.balance).toFixed(2)}
                    prefix="RM"
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Balance"
                    value={Number(creditNote.balance).toFixed(2)}
                    prefix="RM"
                    valueStyle={{ color: creditNote.balance > 0 ? '#1890ff' : undefined }}
                  />
                </Col>
              </Row>
            </div>
          </Card>

          <Card title="Timeline" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13 }}>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">Created</Text>
                <br />
                {dayjs(creditNote.createdAt).format('DD/MM/YYYY HH:mm')}
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">Last Updated</Text>
                <br />
                {dayjs(creditNote.updatedAt).format('DD/MM/YYYY HH:mm')}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Apply Credit Note Modal */}
      <Modal
        title="Apply Credit Note to Invoices"
        open={applyModalOpen}
        onCancel={() => setApplyModalOpen(false)}
        width={700}
        footer={[
          <Button key="cancel" onClick={() => setApplyModalOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="apply"
            type="primary"
            onClick={handleApply}
            loading={applyCreditNote.isPending}
            disabled={totalAllocated === 0}
          >
            Apply Credit
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="Credit Note Balance"
                value={Number(creditNote.balance).toFixed(2)}
                prefix="RM"
              />
            </Col>
            <Col span={8}>
              <Statistic title="Amount to Apply" value={totalAllocated.toFixed(2)} prefix="RM" />
            </Col>
            <Col span={8}>
              <Statistic
                title="Remaining"
                value={remainingBalance.toFixed(2)}
                prefix="RM"
                valueStyle={{ color: remainingBalance < 0 ? '#ff4d4f' : undefined }}
              />
            </Col>
          </Row>
        </div>

        <Table
          columns={allocationColumns}
          dataSource={allocations}
          rowKey="invoiceId"
          pagination={false}
          size="small"
        />
      </Modal>
    </div>
  );
}
