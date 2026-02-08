'use client';

import { Tag } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  StopOutlined,
} from '@ant-design/icons';

interface EInvoiceStatusTagProps {
  status: string;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  PENDING: {
    color: 'default',
    icon: <ClockCircleOutlined />,
    label: 'Pending',
  },
  SUBMITTED: {
    color: 'processing',
    icon: <SyncOutlined spin />,
    label: 'Submitted',
  },
  VALIDATED: {
    color: 'success',
    icon: <CheckCircleOutlined />,
    label: 'Validated',
  },
  REJECTED: {
    color: 'error',
    icon: <CloseCircleOutlined />,
    label: 'Rejected',
  },
  CANCELLED: {
    color: 'warning',
    icon: <StopOutlined />,
    label: 'Cancelled',
  },
};

export function EInvoiceStatusTag({ status }: EInvoiceStatusTagProps) {
  const config = statusConfig[status] || {
    color: 'default',
    icon: <ClockCircleOutlined />,
    label: status,
  };

  return (
    <Tag icon={config.icon} color={config.color}>
      {config.label}
    </Tag>
  );
}
