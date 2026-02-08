'use client';

import { use, useState } from 'react';
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
  Form,
  Input,
  DatePicker,
  Divider,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  TruckOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import {
  useVendorPurchaseOrder,
  useConfirmPurchaseOrder,
  useUpdateDeliveryStatus,
} from '@/hooks/use-vendor-portal';
import type { PurchaseOrderItem } from '@/lib/purchases';

const { Title, Text } = Typography;
const { TextArea } = Input;

const statusColors: Record<string, string> = {
  DRAFT: 'default',
  ISSUED: 'blue',
  PARTIALLY_RECEIVED: 'orange',
  RECEIVED: 'green',
  CLOSED: 'default',
  CANCELLED: 'red',
};

export default function VendorPODetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: po, isLoading } = useVendorPurchaseOrder(id);
  const confirmPO = useConfirmPurchaseOrder();
  const updateDelivery = useUpdateDeliveryStatus();

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [confirmForm] = Form.useForm();
  const [deliveryForm] = Form.useForm();

  const handleConfirm = async () => {
    try {
      const values = await confirmForm.validateFields();
      await confirmPO.mutateAsync({
        id,
        data: {
          confirmedDate: values.confirmedDate.toISOString(),
          notes: values.notes,
        },
      });
      setConfirmModalOpen(false);
      confirmForm.resetFields();
    } catch {
      // Form validation error - handled by antd
    }
  };

  const handleDeliveryUpdate = async () => {
    try {
      const values = await deliveryForm.validateFields();
      await updateDelivery.mutateAsync({
        id,
        data: {
          expectedDeliveryDate: values.expectedDeliveryDate.toISOString(),
          trackingNumber: values.trackingNumber,
          notes: values.notes,
        },
      });
      setDeliveryModalOpen(false);
      deliveryForm.resetFields();
    } catch {
      // Form validation error - handled by antd
    }
  };

  const itemColumns: TableColumnsType<PurchaseOrderItem> = [
    {
      title: 'Item',
      key: 'item',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.item.sku}</Text>
          <Text type="secondary">{record.item.name}</Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.description}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Ordered',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'center',
      render: (qty: number, record) =>
        `${Number(qty)} ${record.item.unit}`,
    },
    {
      title: 'Received',
      dataIndex: 'receivedQty',
      key: 'receivedQty',
      width: 100,
      align: 'center',
      render: (qty: number, record) => {
        const ordered = Number(record.quantity);
        const received = Number(qty);
        return (
          <Text
            type={received >= ordered ? 'success' : received > 0 ? 'warning' : undefined}
          >
            {received} / {ordered}
          </Text>
        );
      },
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      align: 'right',
      render: (price: number) => `RM ${Number(price).toFixed(2)}`,
    },
    {
      title: 'Tax',
      dataIndex: 'taxAmount',
      key: 'taxAmount',
      width: 100,
      align: 'right',
      render: (tax: number) => `RM ${Number(tax).toFixed(2)}`,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (amount: number) => (
        <Text strong>RM {Number(amount).toFixed(2)}</Text>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!po) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Text>Purchase order not found</Text>
      </div>
    );
  }

  const canConfirm = po.status === 'ISSUED';
  const canUpdateDelivery = !['CANCELLED', 'CLOSED'].includes(po.status);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/portal/vendor/purchase-orders">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back to Purchase Orders
            </Button>
          </Link>
        </Space>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              {po.orderNumber}
            </Title>
            <Tag color={statusColors[po.status]}>
              {po.status.replace(/_/g, ' ')}
            </Tag>
          </Space>
          <Space>
            {canConfirm && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => setConfirmModalOpen(true)}
              >
                Confirm Order
              </Button>
            )}
            {canUpdateDelivery && (
              <Button
                icon={<TruckOutlined />}
                onClick={() => setDeliveryModalOpen(true)}
              >
                Update Delivery
              </Button>
            )}
          </Space>
        </div>
      </div>

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          {/* Order Details */}
          <Card title="Order Details" style={{ marginBottom: 16 }}>
            <Descriptions column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Order Date">
                {dayjs(po.orderDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Expected Date">
                {po.expectedDate ? (
                  <Space>
                    <CalendarOutlined />
                    {dayjs(po.expectedDate).format('DD/MM/YYYY')}
                  </Space>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Reference #">
                {po.referenceNumber || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Receive Status">
                <Tag
                  color={
                    po.receiveStatus === 'RECEIVED'
                      ? 'green'
                      : po.receiveStatus === 'PARTIALLY_RECEIVED'
                        ? 'orange'
                        : 'default'
                  }
                >
                  {po.receiveStatus.replace(/_/g, ' ')}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Bill Status">
                <Tag>
                  {(po.billStatus || 'NOT_BILLED').replace(/_/g, ' ')}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            {po.notes && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Notes:
                  </Text>
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      marginTop: 4,
                      padding: 8,
                      background: '#fafafa',
                      borderRadius: 4,
                      fontSize: 13,
                    }}
                  >
                    {po.notes}
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* Line Items */}
          <Card title="Line Items">
            <Table
              columns={itemColumns}
              dataSource={po.items}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          {/* Order Summary */}
          <Card title="Order Summary" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between' }}
              >
                <Text type="secondary">Subtotal</Text>
                <Text>RM {Number(po.subtotal).toFixed(2)}</Text>
              </div>
              {Number(po.discountAmount || 0) > 0 && (
                <div
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <Text type="secondary">Discount</Text>
                  <Text>
                    - RM {Number(po.discountAmount).toFixed(2)}
                  </Text>
                </div>
              )}
              {Number(po.shippingCharges || 0) > 0 && (
                <div
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <Text type="secondary">Shipping</Text>
                  <Text>
                    RM {Number(po.shippingCharges).toFixed(2)}
                  </Text>
                </div>
              )}
              <div
                style={{ display: 'flex', justifyContent: 'space-between' }}
              >
                <Text type="secondary">Tax</Text>
                <Text>RM {Number(po.taxAmount).toFixed(2)}</Text>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div
                style={{ display: 'flex', justifyContent: 'space-between' }}
              >
                <Text strong style={{ fontSize: 16 }}>
                  Total
                </Text>
                <Text strong style={{ fontSize: 16 }}>
                  RM {Number(po.total).toFixed(2)}
                </Text>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          {canConfirm && (
            <Card
              title="Action Required"
              style={{
                borderColor: '#1677ff',
                background: '#f0f5ff',
              }}
            >
              <Text>
                This purchase order requires your confirmation. Please review the
                items and confirm to acknowledge the order.
              </Text>
              <Button
                type="primary"
                block
                icon={<CheckCircleOutlined />}
                style={{ marginTop: 16 }}
                onClick={() => setConfirmModalOpen(true)}
              >
                Confirm Order
              </Button>
            </Card>
          )}
        </Col>
      </Row>

      {/* Confirm PO Modal */}
      <Modal
        title="Confirm Purchase Order"
        open={confirmModalOpen}
        onOk={handleConfirm}
        onCancel={() => {
          setConfirmModalOpen(false);
          confirmForm.resetFields();
        }}
        confirmLoading={confirmPO.isPending}
        okText="Confirm Order"
      >
        <Form form={confirmForm} layout="vertical">
          <Form.Item
            name="confirmedDate"
            label="Estimated Delivery Date"
            rules={[
              {
                required: true,
                message: 'Please select the estimated delivery date',
              },
            ]}
          >
            <DatePicker
              style={{ width: '100%' }}
              disabledDate={(current) =>
                current && current < dayjs().startOf('day')
              }
            />
          </Form.Item>
          <Form.Item name="notes" label="Notes (optional)">
            <TextArea
              rows={3}
              placeholder="Add any notes about this confirmation..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Update Delivery Modal */}
      <Modal
        title="Update Delivery Status"
        open={deliveryModalOpen}
        onOk={handleDeliveryUpdate}
        onCancel={() => {
          setDeliveryModalOpen(false);
          deliveryForm.resetFields();
        }}
        confirmLoading={updateDelivery.isPending}
        okText="Update Delivery"
      >
        <Form form={deliveryForm} layout="vertical">
          <Form.Item
            name="expectedDeliveryDate"
            label="Expected Delivery Date"
            rules={[
              {
                required: true,
                message: 'Please select the expected delivery date',
              },
            ]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="trackingNumber" label="Tracking Number (optional)">
            <Input placeholder="Enter tracking number..." />
          </Form.Item>
          <Form.Item name="notes" label="Notes (optional)">
            <TextArea
              rows={3}
              placeholder="Add delivery update notes..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
