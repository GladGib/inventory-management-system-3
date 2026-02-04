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
  Descriptions,
  Table,
  Spin,
  Tag,
  Modal,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckOutlined,
  CloseOutlined,
  InboxOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  useTransfer,
  useIssueTransfer,
  useReceiveTransfer,
  useCancelTransfer,
} from '@/hooks/use-inventory';
import { TransferItem, TransferStatus } from '@/lib/inventory';

const { Title, Text } = Typography;
const { confirm } = Modal;

const statusColors: Record<TransferStatus, string> = {
  DRAFT: 'default',
  IN_TRANSIT: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

export default function TransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: transfer, isLoading } = useTransfer(id);
  const issueTransfer = useIssueTransfer();
  const receiveTransfer = useReceiveTransfer();
  const cancelTransfer = useCancelTransfer();

  const handleIssue = () => {
    confirm({
      title: 'Issue Transfer',
      icon: <CheckOutlined />,
      content: `Issue ${transfer?.transferNumber}? This will decrease stock at the source warehouse.`,
      onOk: () => issueTransfer.mutate(id),
    });
  };

  const handleReceive = () => {
    confirm({
      title: 'Receive Transfer',
      icon: <InboxOutlined />,
      content: `Mark ${transfer?.transferNumber} as received? This will increase stock at the destination warehouse.`,
      onOk: () => receiveTransfer.mutate(id),
    });
  };

  const handleCancel = () => {
    confirm({
      title: 'Cancel Transfer',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to cancel ${transfer?.transferNumber}?${
        transfer?.status === 'IN_TRANSIT' ? ' Stock at the source warehouse will be restored.' : ''
      }`,
      okText: 'Cancel Transfer',
      okType: 'danger',
      onOk: () => cancelTransfer.mutate(id),
    });
  };

  const columns: TableColumnsType<TransferItem> = [
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
      title: 'Transfer Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 150,
      render: (qty, record) => (
        <Text strong>
          {qty} {record.item.unit}
        </Text>
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

  if (!transfer) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Text>Transfer not found</Text>
      </div>
    );
  }

  const canIssue = transfer.status === 'DRAFT';
  const canReceive = transfer.status === 'IN_TRANSIT';
  const canCancel = ['DRAFT', 'IN_TRANSIT'].includes(transfer.status);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/inventory/transfers">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              {transfer.transferNumber}
            </Title>
            <Tag color={statusColors[transfer.status]}>{transfer.status.replace('_', ' ')}</Tag>
          </Space>
          <Space>
            {canIssue && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleIssue}
                loading={issueTransfer.isPending}
              >
                Issue Transfer
              </Button>
            )}
            {canReceive && (
              <Button
                type="primary"
                icon={<InboxOutlined />}
                onClick={handleReceive}
                loading={receiveTransfer.isPending}
              >
                Receive Transfer
              </Button>
            )}
            {canCancel && (
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={handleCancel}
                loading={cancelTransfer.isPending}
              >
                Cancel
              </Button>
            )}
          </Space>
        </div>
      </div>

      <Row gutter={24}>
        <Col span={24}>
          {/* Transfer Details */}
          <Card title="Transfer Details" style={{ marginBottom: 16 }}>
            <Row gutter={16} align="middle">
              <Col span={8}>
                <Descriptions column={1}>
                  <Descriptions.Item label="Source Warehouse">
                    <Text strong>{transfer.sourceWarehouse.name}</Text>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      ({transfer.sourceWarehouse.code})
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </Col>
              <Col span={2} style={{ textAlign: 'center' }}>
                <ArrowRightOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              </Col>
              <Col span={8}>
                <Descriptions column={1}>
                  <Descriptions.Item label="Destination Warehouse">
                    <Text strong>{transfer.destinationWarehouse.name}</Text>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      ({transfer.destinationWarehouse.code})
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </Col>
              <Col span={6}>
                <Descriptions column={1}>
                  <Descriptions.Item label="Transfer Date">
                    {dayjs(transfer.transferDate).format('DD/MM/YYYY')}
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>
          </Card>

          {/* Transfer Items */}
          <Card title="Transfer Items">
            <Table
              columns={columns}
              dataSource={transfer.items}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>

          {/* Notes */}
          {transfer.notes && (
            <Card title="Notes" style={{ marginTop: 16 }}>
              <Text>{transfer.notes}</Text>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
