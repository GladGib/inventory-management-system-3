'use client';

import { Card, Tag, Typography, Progress, Space, Tooltip } from 'antd';
import {
  InboxOutlined,
  ShoppingCartOutlined,
  ImportOutlined,
  ExportOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import type { Bin } from '@/types/models';
import { BinType } from '@/types/enums';

const { Text } = Typography;

const BIN_TYPE_CONFIG: Record<
  BinType,
  { color: string; icon: React.ReactNode; label: string }
> = {
  [BinType.STORAGE]: {
    color: 'blue',
    icon: <InboxOutlined />,
    label: 'Storage',
  },
  [BinType.PICKING]: {
    color: 'green',
    icon: <ShoppingCartOutlined />,
    label: 'Picking',
  },
  [BinType.RECEIVING]: {
    color: 'orange',
    icon: <ImportOutlined />,
    label: 'Receiving',
  },
  [BinType.SHIPPING]: {
    color: 'purple',
    icon: <ExportOutlined />,
    label: 'Shipping',
  },
  [BinType.STAGING]: {
    color: 'cyan',
    icon: <SwapOutlined />,
    label: 'Staging',
  },
};

interface BinCardProps {
  bin: Bin;
  onClick?: (bin: Bin) => void;
  selected?: boolean;
}

export function BinCard({ bin, onClick, selected }: BinCardProps) {
  const typeConfig = BIN_TYPE_CONFIG[bin.type] || BIN_TYPE_CONFIG[BinType.STORAGE];
  const capacityPercent =
    bin.maxCapacity && bin.totalQuantity != null
      ? Math.min(100, Math.round((bin.totalQuantity / bin.maxCapacity) * 100))
      : null;

  const getCapacityStatus = (percent: number) => {
    if (percent >= 90) return 'exception';
    if (percent >= 70) return 'normal';
    return 'success';
  };

  return (
    <Card
      size="small"
      hoverable
      onClick={() => onClick?.(bin)}
      style={{
        cursor: 'pointer',
        borderColor: selected ? '#1677ff' : undefined,
        borderWidth: selected ? 2 : 1,
        opacity: bin.isActive ? 1 : 0.6,
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 4,
          }}
        >
          <Text strong style={{ fontSize: 14 }}>
            {bin.code}
          </Text>
          <Tag color={typeConfig.color} style={{ margin: 0 }}>
            {typeConfig.icon} {typeConfig.label}
          </Tag>
        </div>
        {bin.name && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {bin.name}
          </Text>
        )}
      </div>

      <div style={{ marginBottom: 8 }}>
        <Space size={16}>
          <Tooltip title="Items in bin">
            <Text type="secondary" style={{ fontSize: 12 }}>
              Items: <Text strong>{bin.itemCount ?? 0}</Text>
            </Text>
          </Tooltip>
          <Tooltip title="Total quantity">
            <Text type="secondary" style={{ fontSize: 12 }}>
              Qty: <Text strong>{bin.totalQuantity ?? 0}</Text>
            </Text>
          </Tooltip>
        </Space>
      </div>

      {capacityPercent !== null && (
        <Tooltip
          title={`${bin.totalQuantity ?? 0} / ${bin.maxCapacity} (${capacityPercent}%)`}
        >
          <Progress
            percent={capacityPercent}
            size="small"
            status={getCapacityStatus(capacityPercent)}
            showInfo={false}
            style={{ marginBottom: 0 }}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {capacityPercent}% capacity
          </Text>
        </Tooltip>
      )}

      {bin.warehouseZone && (
        <div style={{ marginTop: 4 }}>
          <Tag style={{ fontSize: 11, margin: 0 }}>{bin.warehouseZone.name}</Tag>
        </div>
      )}

      {!bin.isActive && (
        <Tag color="red" style={{ marginTop: 4, fontSize: 11 }}>
          Inactive
        </Tag>
      )}
    </Card>
  );
}
