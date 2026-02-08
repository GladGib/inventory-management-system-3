'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dayjs from 'dayjs';
import {
  Card,
  Typography,
  Descriptions,
  Tag,
  Button,
  Space,
  Spin,
  Modal,
  Row,
  Col,
  Statistic,
  Alert,
} from 'antd';
import {
  ArrowLeftOutlined,
  InboxOutlined,
  DollarOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  useCoreReturn,
  useReceiveCoreReturn,
  useCreditCoreReturn,
  useRejectCoreReturn,
} from '@/hooks/use-core-returns';
import { CoreReturnStatus } from '@/lib/core-returns';

const { Title, Text } = Typography;
const { confirm } = Modal;

const statusColors: Record<CoreReturnStatus, string> = {
  PENDING: 'default',
  RECEIVED: 'blue',
  CREDITED: 'green',
  REJECTED: 'red',
};

const statusLabels: Record<CoreReturnStatus, string> = {
  PENDING: 'Pending',
  RECEIVED: 'Received',
  CREDITED: 'Credited',
  REJECTED: 'Rejected',
};

export default function CoreReturnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: coreReturn, isLoading, error } = useCoreReturn(id);
  const receiveReturn = useReceiveCoreReturn();
  const creditReturn = useCreditCoreReturn();
  const rejectReturn = useRejectCoreReturn();

  const isOverdue =
    coreReturn?.status === 'PENDING' &&
    dayjs(coreReturn.dueDate).isBefore(dayjs());

  const daysUntilDue = coreReturn
    ? dayjs(coreReturn.dueDate).diff(dayjs(), 'day')
    : 0;

  const handleReceive = () => {
    confirm({
      title: 'Receive Core Return',
      icon: <InboxOutlined />,
      content: `Mark core return ${coreReturn?.returnNumber} as received?`,
      onOk: () => receiveReturn.mutate({ id }),
    });
  };

  const handleCredit = () => {
    confirm({
      title: 'Issue Credit',
      icon: <DollarOutlined />,
      content: `Issue credit of RM ${Number(coreReturn?.coreCharge).toFixed(2)} to customer?`,
      onOk: () => creditReturn.mutate({ id }),
    });
  };

  const handleReject = () => {
    confirm({
      title: 'Reject Core Return',
      icon: <ExclamationCircleOutlined />,
      content: `Reject core return ${coreReturn?.returnNumber}? The core deposit will not be refunded.`,
      okText: 'Reject',
      okType: 'danger',
      onOk: () => rejectReturn.mutate({ id }),
    });
  };

  const getActionButtons = () => {
    if (!coreReturn) return null;

    const buttons: React.ReactNode[] = [];

    if (coreReturn.status === 'PENDING') {
      buttons.push(
        <Button
          key="receive"
          type="primary"
          icon={<InboxOutlined />}
          onClick={handleReceive}
          loading={receiveReturn.isPending}
        >
          Mark as Received
        </Button>,
      );
    }

    if (coreReturn.status === 'RECEIVED') {
      buttons.push(
        <Button
          key="credit"
          type="primary"
          icon={<DollarOutlined />}
          onClick={handleCredit}
          loading={creditReturn.isPending}
        >
          Issue Credit
        </Button>,
      );
    }

    if (['PENDING', 'RECEIVED'].includes(coreReturn.status)) {
      buttons.push(
        <Button
          key="reject"
          danger
          icon={<CloseOutlined />}
          onClick={handleReject}
          loading={rejectReturn.isPending}
        >
          Reject
        </Button>,
      );
    }

    return buttons;
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !coreReturn) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Text type="danger">Failed to load core return</Text>
        <br />
        <Link href="/sales/core-returns">
          <Button type="primary" style={{ marginTop: 16 }}>
            Back to Core Returns
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/sales/core-returns">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
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
          <Space align="center">
            <Title level={4} style={{ margin: 0 }}>
              {coreReturn.returnNumber}
            </Title>
            <Tag color={statusColors[coreReturn.status]}>
              {statusLabels[coreReturn.status]}
            </Tag>
            {isOverdue && <Tag color="red">OVERDUE</Tag>}
          </Space>
          <Space>{getActionButtons()}</Space>
        </div>
      </div>

      {isOverdue && (
        <Alert
          type="error"
          icon={<WarningOutlined />}
          message="Core Return Overdue"
          description={`This core return was due ${dayjs(coreReturn.dueDate).format('DD/MM/YYYY')} (${Math.abs(daysUntilDue)} days ago). Consider contacting the customer or charging the core deposit.`}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={24}>
        <Col span={16}>
          <Card title="Core Return Details">
            <Descriptions column={2}>
              <Descriptions.Item label="Customer">
                {coreReturn.customer?.displayName || coreReturn.customerId}
              </Descriptions.Item>
              <Descriptions.Item label="Item">
                <div>
                  <Text strong>{coreReturn.item?.name}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {coreReturn.item?.sku}
                  </Text>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Core Charge">
                <Text strong style={{ fontSize: 16 }}>
                  RM {Number(coreReturn.coreCharge).toFixed(2)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Due Date">
                <Space>
                  <ClockCircleOutlined />
                  <span
                    style={{
                      color: isOverdue ? '#ff4d4f' : undefined,
                      fontWeight: isOverdue ? 600 : undefined,
                    }}
                  >
                    {dayjs(coreReturn.dueDate).format('DD/MM/YYYY')}
                  </span>
                  {coreReturn.status === 'PENDING' && !isOverdue && (
                    <Tag color="blue">{daysUntilDue} days remaining</Tag>
                  )}
                </Space>
              </Descriptions.Item>
              {coreReturn.returnDate && (
                <Descriptions.Item label="Return Date">
                  {dayjs(coreReturn.returnDate).format('DD/MM/YYYY')}
                </Descriptions.Item>
              )}
              {coreReturn.salesOrderId && (
                <Descriptions.Item label="Sales Order">
                  <Link href={`/sales/orders/${coreReturn.salesOrderId}`}>
                    View Order
                  </Link>
                </Descriptions.Item>
              )}
              {coreReturn.invoiceId && (
                <Descriptions.Item label="Invoice">
                  <Link href={`/sales/invoices/${coreReturn.invoiceId}`}>
                    View Invoice
                  </Link>
                </Descriptions.Item>
              )}
              {coreReturn.notes && (
                <Descriptions.Item label="Notes" span={2}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {coreReturn.notes}
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        <Col span={8}>
          <Card title="Summary">
            <Statistic
              title="Core Charge"
              value={Number(coreReturn.coreCharge).toFixed(2)}
              prefix="RM"
              valueStyle={{ fontSize: 28, fontWeight: 600 }}
            />
            <div style={{ marginTop: 24 }}>
              <Statistic
                title="Status"
                value={statusLabels[coreReturn.status]}
                valueStyle={{
                  fontSize: 16,
                  color:
                    coreReturn.status === 'CREDITED'
                      ? '#52c41a'
                      : coreReturn.status === 'REJECTED'
                        ? '#ff4d4f'
                        : undefined,
                }}
              />
            </div>
            {coreReturn.status === 'PENDING' && (
              <div style={{ marginTop: 24 }}>
                <Statistic
                  title={isOverdue ? 'Days Overdue' : 'Days Until Due'}
                  value={Math.abs(daysUntilDue)}
                  valueStyle={{
                    color: isOverdue ? '#ff4d4f' : '#1677ff',
                  }}
                />
              </div>
            )}
          </Card>

          <Card title="Timeline" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13 }}>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">Created</Text>
                <br />
                {dayjs(coreReturn.createdAt).format('DD/MM/YYYY HH:mm')}
              </div>
              {coreReturn.returnDate && (
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">Core Received</Text>
                  <br />
                  {dayjs(coreReturn.returnDate).format('DD/MM/YYYY HH:mm')}
                </div>
              )}
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">Last Updated</Text>
                <br />
                {dayjs(coreReturn.updatedAt).format('DD/MM/YYYY HH:mm')}
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
