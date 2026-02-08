'use client';

import { Tag } from 'antd';
import type { SerialStatus } from '@/lib/serial';

const statusConfig: Record<SerialStatus, { color: string; label: string }> = {
  IN_STOCK: { color: 'green', label: 'In Stock' },
  SOLD: { color: 'blue', label: 'Sold' },
  RETURNED: { color: 'orange', label: 'Returned' },
  DAMAGED: { color: 'red', label: 'Damaged' },
  DEFECTIVE: { color: 'red', label: 'Defective' },
  IN_REPAIR: { color: 'purple', label: 'In Repair' },
  SCRAPPED: { color: 'default', label: 'Scrapped' },
  IN_TRANSIT: { color: 'cyan', label: 'In Transit' },
};

interface SerialStatusTagProps {
  status: SerialStatus;
}

export function SerialStatusTag({ status }: SerialStatusTagProps) {
  const config = statusConfig[status] || { color: 'default', label: status };
  return <Tag color={config.color}>{config.label}</Tag>;
}
