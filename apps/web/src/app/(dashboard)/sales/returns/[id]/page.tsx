'use client';

import { useParams, useRouter } from 'next/navigation';
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
  Modal,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  CheckOutlined,
  InboxOutlined,
  FileTextOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  useSalesReturn,
  useApproveSalesReturn,
  useReceiveSalesReturn,
  useProcessSalesReturn,
  useRejectSalesReturn,
} from '@/hooks/use-sales';
import { ReturnStatus, ItemCondition, SalesReturnItem } from '@/lib/sales';

const { Title, Text } = Typography;
const { confirm } = Modal;

const statusColors: Record<ReturnStatus, string> = {
  PENDING: 'default',
  APPROVED: 'blue',
  RECEIVED: 'cyan',
  PROCESSED: 'green',
  REJECTED: 'red',
};

const conditionColors: Record<ItemCondition, string> = {
  GOOD: 'green',
  DAMAGED: 'orange',
  DEFECTIVE: 'red',
};

const reasonLabels: Record<string, string> = {
  DEFECTIVE: 'Defective Product',
  WRONG_ITEM: 'Wrong Item Shipped',
  CHANGED_MIND: 'Changed Mind',
  NOT_AS_DESCRIBED: 'Not as Described',
  QUALITY_ISSUE: 'Quality Issue',
  DUPLICATE_ORDER: 'Duplicate Order',
  OTHER: 'Other',
};

export default function SalesReturnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: salesReturn, isLoading, error } = useSalesReturn(id);
  const approveReturn = useApproveSalesReturn();
  const receiveReturn = useReceiveSalesReturn();
  const processReturn = useProcessSalesReturn();
  const rejectReturn = useRejectSalesReturn();

  const handleApprove = () => {
    confirm({
      title: 'Approve Return',
      icon: <CheckOutlined />,
      content: `Approve return ${salesReturn?.returnNumber}?`,
      onOk: () => approveReturn.mutate(id),
    });
  };

  const handleReceive = () => {
    confirm({
      title: 'Receive Return',
      icon: <InboxOutlined />,
      content: `Mark return ${salesReturn?.returnNumber} as received? This will restore stock if enabled.`,
      onOk: () => receiveReturn.mutate(id),
    });
  };

  const handleProcess = () => {
    confirm({
      title: 'Process Return',
      icon: <FileTextOutlined />,
      content: `Process return ${salesReturn?.returnNumber}? This will generate a credit note.`,
      onOk: () => processReturn.mutate(id),
    });
  };

  const handleReject = () => {
    confirm({
      title: 'Reject Return',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to reject return ${salesReturn?.returnNumber}?`,
      okText: 'Reject',
      okType: 'danger',
      onOk: () => rejectReturn.mutate(id),
    });
  };

  const getActionButtons = () => {
    if (!salesReturn) return null;

    const buttons: React.ReactNode[] = [];

    if (salesReturn.status === 'PENDING') {
      buttons.push(
        <Button
          key="edit"
          icon={<EditOutlined />}
          onClick={() => router.push(`/sales/returns/${id}/edit`)}
        >
          Edit
        </Button>,
        <Button key="approve" type="primary" icon={<CheckOutlined />} onClick={handleApprove}>
          Approve
        </Button>
      );
    }

    if (salesReturn.status === 'APPROVED') {
      buttons.push(
        <Button key="receive" type="primary" icon={<InboxOutlined />} onClick={handleReceive}>
          Receive Items
        </Button>
      );
    }

    if (salesReturn.status === 'RECEIVED') {
      buttons.push(
        <Button key="process" type="primary" icon={<FileTextOutlined />} onClick={handleProcess}>
          Process & Generate Credit Note
        </Button>
      );
    }

    if (['PENDING', 'APPROVED'].includes(salesReturn.status)) {
      buttons.push(
        <Button key="reject" danger icon={<CloseOutlined />} onClick={handleReject}>
          Reject
        </Button>
      );
    }

    return buttons;
  };

  const columns = [
    {
      title: 'Item',
      dataIndex: ['item', 'name'],
      key: 'item',
      render: (_: string, record: SalesReturnItem) => (
        <div>
          <Text strong>{record.item.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.item.sku}
          </Text>
        </div>
      ),
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
      title: 'Condition',
      dataIndex: 'condition',
      key: 'condition',
      width: 100,
      render: (condition: ItemCondition) => (
        <Tag color={conditionColors[condition]}>{condition}</Tag>
      ),
    },
    {
      title: 'Restocked',
      dataIndex: 'restocked',
      key: 'restocked',
      width: 100,
      align: 'center' as const,
      render: (restocked: boolean) => (restocked ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>),
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

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !salesReturn) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Text type="danger">Failed to load sales return</Text>
        <br />
        <Link href="/sales/returns">
          <Button type="primary" style={{ marginTop: 16 }}>
            Back to Returns
          </Button>
        </Link>
      </div>
    );
  }

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space align="center">
            <Title level={4} style={{ margin: 0 }}>
              {salesReturn.returnNumber}
            </Title>
            <Tag color={statusColors[salesReturn.status]}>{salesReturn.status}</Tag>
          </Space>
          <Space>{getActionButtons()}</Space>
        </div>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          <Card title="Return Details">
            <Descriptions column={2}>
              <Descriptions.Item label="Customer">
                <Link href={`/contacts/customers/${salesReturn.customerId}`}>
                  {salesReturn.customer.displayName}
                </Link>
              </Descriptions.Item>
              <Descriptions.Item label="Return Date">
                {dayjs(salesReturn.returnDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Reason">
                {reasonLabels[salesReturn.reason] || salesReturn.reason}
              </Descriptions.Item>
              <Descriptions.Item label="Restock Items">
                {salesReturn.restockItems ? 'Yes' : 'No'}
              </Descriptions.Item>
              {salesReturn.invoice && (
                <Descriptions.Item label="Related Invoice">
                  <Link href={`/sales/invoices/${salesReturn.invoice.id}`}>
                    {salesReturn.invoice.invoiceNumber}
                  </Link>
                </Descriptions.Item>
              )}
              {salesReturn.salesOrder && (
                <Descriptions.Item label="Related Sales Order">
                  <Link href={`/sales/orders/${salesReturn.salesOrder.id}`}>
                    {salesReturn.salesOrder.orderNumber}
                  </Link>
                </Descriptions.Item>
              )}
              {salesReturn.warehouse && (
                <Descriptions.Item label="Warehouse">
                  {salesReturn.warehouse.name}
                </Descriptions.Item>
              )}
              {salesReturn.creditNote && (
                <Descriptions.Item label="Credit Note">
                  <Link href={`/sales/credit-notes/${salesReturn.creditNote.id}`}>
                    {salesReturn.creditNote.creditNumber}
                  </Link>
                </Descriptions.Item>
              )}
              {salesReturn.notes && (
                <Descriptions.Item label="Notes" span={2}>
                  {salesReturn.notes}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Card title="Return Items" style={{ marginTop: 16 }}>
            <Table
              columns={columns}
              dataSource={salesReturn.items}
              rowKey="id"
              pagination={false}
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={6} align="right">
                      <strong>Subtotal</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <strong>RM {Number(salesReturn.subtotal).toFixed(2)}</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={6} align="right">
                      Tax
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      RM {Number(salesReturn.taxAmount).toFixed(2)}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={6} align="right">
                      <strong>Total</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <strong style={{ fontSize: 16 }}>
                        RM {Number(salesReturn.total).toFixed(2)}
                      </strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card title="Summary">
            <Statistic
              title="Total Return Value"
              value={Number(salesReturn.total).toFixed(2)}
              prefix="RM"
              valueStyle={{ fontSize: 28, fontWeight: 600 }}
            />
            <div style={{ marginTop: 24 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="Items"
                    value={salesReturn.items?.length || salesReturn._count?.items || 0}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Tax Amount"
                    value={Number(salesReturn.taxAmount).toFixed(2)}
                    prefix="RM"
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
                {dayjs(salesReturn.createdAt).format('DD/MM/YYYY HH:mm')}
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">Last Updated</Text>
                <br />
                {dayjs(salesReturn.updatedAt).format('DD/MM/YYYY HH:mm')}
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
