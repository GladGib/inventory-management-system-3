'use client';

import { Tag } from 'antd';
import type { BatchStatus } from '@/lib/batch';

const statusConfig: Record<BatchStatus, { color: string; label: string }> = {
  ACTIVE: { color: 'green', label: 'Active' },
  EXPIRED: { color: 'red', label: 'Expired' },
  DEPLETED: { color: 'default', label: 'Depleted' },
  RECALLED: { color: 'orange', label: 'Recalled' },
};

interface BatchStatusTagProps {
  status: BatchStatus;
}

export function BatchStatusTag({ status }: BatchStatusTagProps) {
  const config = statusConfig[status] || { color: 'default', label: status };
  return <Tag color={config.color}>{config.label}</Tag>;
}
