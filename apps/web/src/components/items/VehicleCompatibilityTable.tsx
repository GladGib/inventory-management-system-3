'use client';

import { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Typography,
  Empty,
  Modal,
  Tag,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CarOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { useItemCompatibility, useRemoveCompatibility } from '@/hooks/use-vehicles';
import { ItemVehicleCompatibility } from '@/lib/vehicles';
import { AddCompatibilityModal } from './AddCompatibilityModal';

const { Text } = Typography;
const { confirm } = Modal;

interface VehicleCompatibilityTableProps {
  itemId: string;
}

export function VehicleCompatibilityTable({ itemId }: VehicleCompatibilityTableProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const { data: compatibilities, isLoading } = useItemCompatibility(itemId);
  const removeCompatibility = useRemoveCompatibility();

  const handleRemove = (record: ItemVehicleCompatibility) => {
    confirm({
      title: 'Remove Vehicle Compatibility',
      icon: <ExclamationCircleOutlined />,
      content: `Remove compatibility with ${record.vehicleMake?.name}${
        record.vehicleModel ? ` ${record.vehicleModel.name}` : ''
      }?`,
      okText: 'Remove',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () =>
        removeCompatibility.mutate({ id: record.id, itemId }),
    });
  };

  const formatYearRange = (yearFrom?: number | null, yearTo?: number | null) => {
    if (!yearFrom && !yearTo) return 'All years';
    if (yearFrom && yearTo) return `${yearFrom} - ${yearTo}`;
    if (yearFrom) return `${yearFrom}+`;
    return `Up to ${yearTo}`;
  };

  const columns: TableColumnsType<ItemVehicleCompatibility> = [
    {
      title: 'Make',
      key: 'make',
      width: 160,
      render: (_: unknown, record: ItemVehicleCompatibility) => (
        <Space>
          <CarOutlined />
          <Text strong>{record.vehicleMake?.name || '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Model',
      key: 'model',
      width: 160,
      render: (_: unknown, record: ItemVehicleCompatibility) =>
        record.vehicleModel?.name || (
          <Text type="secondary">All models</Text>
        ),
    },
    {
      title: 'Year Range',
      key: 'yearRange',
      width: 140,
      render: (_: unknown, record: ItemVehicleCompatibility) => (
        <Tag color="blue">
          {formatYearRange(record.yearFrom, record.yearTo)}
        </Tag>
      ),
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (notes: string | null) =>
        notes || <Text type="secondary">-</Text>,
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      align: 'center',
      render: (_: unknown, record: ItemVehicleCompatibility) => (
        <Tooltip title="Remove compatibility">
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleRemove(record)}
            loading={removeCompatibility.isPending}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text strong>
          Compatible Vehicles ({compatibilities?.length || 0})
        </Text>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddModalOpen(true)}
          size="small"
        >
          Add Compatibility
        </Button>
      </div>

      {!isLoading && (!compatibilities || compatibilities.length === 0) ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No vehicle compatibilities configured"
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddModalOpen(true)}
          >
            Add Vehicle Compatibility
          </Button>
        </Empty>
      ) : (
        <Table
          columns={columns}
          dataSource={compatibilities || []}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          size="small"
        />
      )}

      <AddCompatibilityModal
        open={addModalOpen}
        itemId={itemId}
        onClose={() => setAddModalOpen(false)}
      />
    </div>
  );
}
