'use client';

import { Tag } from 'antd';
import type { AlertStatus } from '@/lib/reorder';

const statusConfig: Record<AlertStatus, { color: string; label: string }> = {
  PENDING: { color: 'warning', label: 'Pending' },
  ACKNOWLEDGED: { color: 'processing', label: 'Acknowledged' },
  PO_CREATED: { color: 'blue', label: 'PO Created' },
  RESOLVED: { color: 'success', label: 'Resolved' },
  IGNORED: { color: 'default', label: 'Ignored' },
};

interface ReorderAlertBadgeProps {
  status: AlertStatus;
}

export function ReorderAlertBadge({ status }: ReorderAlertBadgeProps) {
  const config = statusConfig[status] || { color: 'default', label: status };
  return <Tag color={config.color}>{config.label}</Tag>;
}
