'use client';

import { Tag } from 'antd';
import type { AssemblyStatus } from '@/lib/composite';

const statusConfig: Record<AssemblyStatus, { color: string; label: string }> = {
  DRAFT: { color: 'default', label: 'Draft' },
  IN_PROGRESS: { color: 'processing', label: 'In Progress' },
  COMPLETED: { color: 'success', label: 'Completed' },
  CANCELLED: { color: 'error', label: 'Cancelled' },
};

interface AssemblyStatusTagProps {
  status: AssemblyStatus;
}

export function AssemblyStatusTag({ status }: AssemblyStatusTagProps) {
  const config = statusConfig[status] || { color: 'default', label: status };
  return <Tag color={config.color}>{config.label}</Tag>;
}
