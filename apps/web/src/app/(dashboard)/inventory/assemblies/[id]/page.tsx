'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card, Typography, Button, Space, Descriptions, Table, Popconfirm, Spin } from 'antd';
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { useAssembly, useCompleteAssembly, useCancelAssembly } from '@/hooks/use-composite';
import { AssemblyStatusTag } from '@/components/composite/AssemblyStatusTag';
import type { AssemblyItem } from '@/lib/composite';

const { Title, Text } = Typography;

export default function AssemblyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assemblyId = params.id as string;

  const { data: assembly, isLoading } = useAssembly(assemblyId);
  const completeAssembly = useCompleteAssembly();
  const cancelAssembly = useCancelAssembly();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!assembly) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Text type="secondary">Assembly not found</Text>
      </div>
    );
  }

  const isDisassembly = Number(assembly.quantity) < 0;
  const canComplete = assembly.status === 'DRAFT' || assembly.status === 'IN_PROGRESS';
  const canCancel = assembly.status === 'DRAFT' || assembly.status === 'IN_PROGRESS';

  const columns: TableColumnsType<AssemblyItem> = [
    {
      title: 'Item ID',
      dataIndex: 'itemId',
      key: 'itemId',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Required Qty',
      dataIndex: 'requiredQty',
      key: 'requiredQty',
      width: 120,
      align: 'right',
      render: (qty: number) => Number(qty).toFixed(2),
    },
    {
      title: 'Consumed Qty',
      dataIndex: 'consumedQty',
      key: 'consumedQty',
      width: 120,
      align: 'right',
      render: (qty: number) => Number(qty).toFixed(2),
    },
    {
      title: 'Unit Cost',
      dataIndex: 'unitCost',
      key: 'unitCost',
      width: 120,
      align: 'right',
      render: (cost: number) => `RM ${Number(cost).toFixed(2)}`,
    },
    {
      title: 'Total Cost',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 130,
      align: 'right',
      render: (cost: number) => `RM ${Number(cost).toFixed(2)}`,
    },
  ];

  const handleComplete = async () => {
    await completeAssembly.mutateAsync(assemblyId);
  };

  const handleCancel = async () => {
    await cancelAssembly.mutateAsync(assemblyId);
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/inventory/assemblies')}>
            Back
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {isDisassembly ? 'Disassembly' : 'Assembly'} {assembly.assemblyNumber}
          </Title>
          <AssemblyStatusTag status={assembly.status} />
        </Space>

        <Space>
          {canComplete && (
            <Popconfirm
              title="Complete this assembly?"
              description="This will consume components and produce the composite item."
              onConfirm={handleComplete}
            >
              <Button type="primary" icon={<CheckOutlined />} loading={completeAssembly.isPending}>
                Complete
              </Button>
            </Popconfirm>
          )}
          {canCancel && (
            <Popconfirm
              title="Cancel this assembly?"
              description="This action cannot be undone."
              onConfirm={handleCancel}
            >
              <Button danger icon={<CloseOutlined />} loading={cancelAssembly.isPending}>
                Cancel
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* Assembly Info */}
      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="Assembly Number">{assembly.assemblyNumber}</Descriptions.Item>
          <Descriptions.Item label="Composite Item">
            {assembly.compositeItem?.item
              ? `${assembly.compositeItem.item.sku} - ${assembly.compositeItem.item.name}`
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Quantity">
            {Math.abs(Number(assembly.quantity))}
            {isDisassembly && ' (Disassembly)'}
          </Descriptions.Item>
          <Descriptions.Item label="Date">
            {assembly.assemblyDate ? new Date(assembly.assemblyDate).toLocaleDateString() : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Total Cost">
            RM {Number(assembly.totalCost || 0).toFixed(2)}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <AssemblyStatusTag status={assembly.status} />
          </Descriptions.Item>
          {assembly.notes && (
            <Descriptions.Item label="Notes" span={3}>
              {assembly.notes}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Component Items */}
      <Card title="Component Items">
        <Table
          columns={columns}
          dataSource={assembly.items}
          rowKey="id"
          pagination={false}
          scroll={{ x: 700 }}
          summary={(data) => {
            const totalCost = data.reduce((sum, item) => sum + Number(item.totalCost), 0);
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}>
                  <Text strong>Total</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <Text strong>RM {totalCost.toFixed(2)}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>
    </div>
  );
}
