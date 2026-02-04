'use client';

import { use } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import {
  Card,
  Typography,
  Button,
  Space,
  Row,
  Col,
  Tag,
  Descriptions,
  Table,
  Spin,
  Modal,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useBill, useApproveBill, useVoidBill } from '@/hooks/use-purchases';
import { PurchaseOrderSummary } from '@/components/purchases';
import { BillStatus, PurchaseOrderItem } from '@/lib/purchases';

const { Title, Text } = Typography;
const { confirm } = Modal;

const statusColors: Record<BillStatus, string> = {
  DRAFT: 'default',
  RECEIVED: 'blue',
  APPROVED: 'cyan',
  PARTIALLY_PAID: 'orange',
  PAID: 'green',
  OVERDUE: 'red',
  VOID: 'default',
};

export default function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: bill, isLoading } = useBill(id);
  const approveBill = useApproveBill();
  const voidBill = useVoidBill();

  const handleApprove = () => {
    confirm({
      title: 'Approve Bill',
      icon: <CheckOutlined />,
      content: `Approve ${bill?.billNumber}?`,
      onOk: () => approveBill.mutate(id),
    });
  };

  const handleVoid = () => {
    confirm({
      title: 'Void Bill',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to void ${bill?.billNumber}? This action cannot be undone.`,
      okText: 'Void Bill',
      okType: 'danger',
      onOk: () => voidBill.mutate(id),
    });
  };

  const columns: TableColumnsType<PurchaseOrderItem> = [
    {
      title: 'Item',
      key: 'item',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.item.sku}</Text>
          <Text>{record.item.name}</Text>
        </Space>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (qty, record) => `${qty} ${record.item.unit}`,
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      align: 'right',
      render: (price) => `RM ${Number(price).toFixed(2)}`,
    },
    {
      title: 'Tax',
      dataIndex: 'taxAmount',
      key: 'taxAmount',
      width: 100,
      align: 'right',
      render: (tax) => `RM ${Number(tax).toFixed(2)}`,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (amount) => <Text strong>RM {Number(amount).toFixed(2)}</Text>,
    },
  ];

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

  const canEdit = bill.status === 'DRAFT';
  const canApprove = bill.status === 'DRAFT' || bill.status === 'RECEIVED';
  const canRecordPayment = ['APPROVED', 'PARTIALLY_PAID', 'OVERDUE'].includes(bill.status);
  const canVoid = !['VOID', 'PAID'].includes(bill.status);

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              {bill.billNumber}
            </Title>
            <Tag color={statusColors[bill.status]}>{bill.status.replace('_', ' ')}</Tag>
          </Space>
          <Space>
            {canEdit && (
              <Link href={`/purchases/bills/${id}/edit`}>
                <Button icon={<EditOutlined />}>Edit</Button>
              </Link>
            )}
            {canApprove && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleApprove}
                loading={approveBill.isPending}
              >
                Approve
              </Button>
            )}
            {canRecordPayment && (
              <Link href={`/purchases/payments/new?billId=${id}&vendorId=${bill.vendorId}`}>
                <Button type="primary" icon={<DollarOutlined />}>
                  Record Payment
                </Button>
              </Link>
            )}
            {canVoid && (
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={handleVoid}
                loading={voidBill.isPending}
              >
                Void
              </Button>
            )}
          </Space>
        </div>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          {/* Bill Details */}
          <Card title="Bill Details" style={{ marginBottom: 16 }}>
            <Descriptions column={2}>
              <Descriptions.Item label="Vendor">
                <Text strong>{bill.vendor.displayName}</Text>
                {bill.vendor.companyName && (
                  <Text type="secondary" style={{ display: 'block' }}>
                    {bill.vendor.companyName}
                  </Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Vendor Invoice #">
                {bill.vendorInvoiceNumber || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Bill Date">
                {dayjs(bill.billDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Due Date">
                {dayjs(bill.dueDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              {bill.purchaseOrder && (
                <Descriptions.Item label="Purchase Order">
                  <Link href={`/purchases/orders/${bill.purchaseOrder.id}`}>
                    {bill.purchaseOrder.orderNumber}
                  </Link>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Line Items */}
          <Card title="Line Items">
            <Table
              columns={columns}
              dataSource={bill.items}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        <Col span={8}>
          <PurchaseOrderSummary
            subtotal={bill.subtotal}
            discount={bill.discount}
            taxAmount={bill.taxAmount}
            total={bill.total}
            amountPaid={bill.amountPaid}
            showBalance={true}
          />
        </Col>
      </Row>
    </div>
  );
}
