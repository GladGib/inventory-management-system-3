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
  Timeline,
  Divider,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useSerial } from '@/hooks/use-serials';
import { SerialStatusTag } from '@/components/serial';
import { WarrantyBadge } from '@/components/serial';
import type { SerialAction, WarrantyClaim, ClaimStatus } from '@/lib/serial';

const { Title, Text } = Typography;

const actionLabels: Record<SerialAction, string> = {
  RECEIVED: 'Received',
  SOLD: 'Sold',
  RETURNED: 'Returned',
  TRANSFERRED: 'Transferred',
  ADJUSTED: 'Adjusted',
  REPAIRED: 'Repaired',
  SCRAPPED: 'Scrapped',
};

const actionColors: Record<SerialAction, string> = {
  RECEIVED: 'green',
  SOLD: 'blue',
  RETURNED: 'gold',
  TRANSFERRED: 'cyan',
  ADJUSTED: 'orange',
  REPAIRED: 'purple',
  SCRAPPED: 'red',
};

const claimStatusColors: Record<ClaimStatus, string> = {
  PENDING: 'orange',
  APPROVED: 'blue',
  REJECTED: 'red',
  IN_PROGRESS: 'cyan',
  RESOLVED: 'green',
};

export default function SerialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: serial, isLoading } = useSerial(id);

  const claimColumns: TableColumnsType<WarrantyClaim> = [
    {
      title: 'Claim #',
      dataIndex: 'claimNumber',
      key: 'claimNumber',
      width: 150,
      render: (num: string) => <Text strong>{num}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'claimDate',
      key: 'claimDate',
      width: 130,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Issue',
      dataIndex: 'issueDescription',
      key: 'issueDescription',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: ClaimStatus) => (
        <Tag color={claimStatusColors[status]}>{status.replace('_', ' ')}</Tag>
      ),
    },
    {
      title: 'Resolution',
      dataIndex: 'resolution',
      key: 'resolution',
      ellipsis: true,
      render: (res: string | null) => res || '-',
    },
    {
      title: 'Resolved',
      dataIndex: 'resolvedDate',
      key: 'resolvedDate',
      width: 130,
      render: (date: string | null) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!serial) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Text>Serial number not found</Text>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/inventory/serials">
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
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              Serial: {serial.serialNumber}
            </Title>
            <SerialStatusTag status={serial.status} />
          </Space>
        </div>
      </div>

      <Row gutter={24}>
        <Col span={24}>
          {/* Serial Info */}
          <Card title="Serial Number Information" style={{ marginBottom: 16 }}>
            <Descriptions column={3}>
              <Descriptions.Item label="Serial Number">
                <Text strong>{serial.serialNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Item">
                <Text strong>{serial.item.sku}</Text>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  {serial.item.name}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <SerialStatusTag status={serial.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Warehouse">
                {serial.warehouse ? (
                  <>
                    <Text strong>{serial.warehouse.name}</Text>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      ({serial.warehouse.code})
                    </Text>
                  </>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Purchase Date">
                {serial.purchaseDate ? dayjs(serial.purchaseDate).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Purchase Cost">
                {serial.purchaseCost !== null ? `RM ${serial.purchaseCost.toFixed(2)}` : '-'}
              </Descriptions.Item>
            </Descriptions>

            {serial.soldTo && (
              <>
                <Divider orientation="left" plain>
                  Sale Information
                </Divider>
                <Descriptions column={3}>
                  <Descriptions.Item label="Customer">
                    <Text strong>{serial.soldTo.displayName}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Sale Date">
                    {serial.saleDate ? dayjs(serial.saleDate).format('DD/MM/YYYY') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Customer Contact">
                    {serial.soldTo.email || serial.soldTo.phone || '-'}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            <Divider orientation="left" plain>
              Warranty
            </Divider>
            <Descriptions column={3}>
              <Descriptions.Item label="Warranty Status">
                <WarrantyBadge
                  warrantyEndDate={serial.warrantyEndDate}
                  warrantyMonths={serial.warrantyMonths}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Warranty Period">
                {serial.warrantyMonths
                  ? `${serial.warrantyMonths} month${serial.warrantyMonths !== 1 ? 's' : ''}`
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Warranty Dates">
                {serial.warrantyStartDate && serial.warrantyEndDate
                  ? `${dayjs(serial.warrantyStartDate).format('DD/MM/YYYY')} - ${dayjs(serial.warrantyEndDate).format('DD/MM/YYYY')}`
                  : '-'}
              </Descriptions.Item>
            </Descriptions>

            {serial.notes && (
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">Notes: </Text>
                <Text>{serial.notes}</Text>
              </div>
            )}
          </Card>

          {/* Lifecycle Timeline */}
          <Card title="Lifecycle History" style={{ marginBottom: 16 }}>
            {serial.history && serial.history.length > 0 ? (
              <Timeline
                items={serial.history.map((h) => ({
                  color: actionColors[h.action] || 'gray',
                  children: (
                    <div>
                      <Space>
                        <Tag color={actionColors[h.action]}>{actionLabels[h.action]}</Tag>
                        <Text type="secondary">
                          {dayjs(h.createdAt).format('DD/MM/YYYY HH:mm')}
                        </Text>
                      </Space>
                      <div style={{ marginTop: 4 }}>
                        {h.fromStatus && (
                          <Text type="secondary">
                            {h.fromStatus} {'->'} {h.toStatus}
                          </Text>
                        )}
                        {!h.fromStatus && <Text type="secondary">Status: {h.toStatus}</Text>}
                      </div>
                      {h.notes && (
                        <div>
                          <Text style={{ fontSize: 12 }}>{h.notes}</Text>
                        </div>
                      )}
                    </div>
                  ),
                }))}
              />
            ) : (
              <Text type="secondary">No history records</Text>
            )}
          </Card>

          {/* Warranty Claims */}
          {serial.warrantyClaims && serial.warrantyClaims.length > 0 && (
            <Card title="Warranty Claims">
              <Table
                columns={claimColumns}
                dataSource={serial.warrantyClaims}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
