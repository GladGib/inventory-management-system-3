'use client';

import { Alert } from 'antd';
import { WarningOutlined } from '@ant-design/icons';

interface ExpiryAlertProps {
  daysUntilExpiry: number | null | undefined;
  style?: React.CSSProperties;
}

export function ExpiryAlert({ daysUntilExpiry, style }: ExpiryAlertProps) {
  if (daysUntilExpiry === null || daysUntilExpiry === undefined) {
    return null;
  }

  if (daysUntilExpiry <= 0) {
    return (
      <Alert
        message="Batch Expired"
        description="This batch has passed its expiry date. It should not be sold or used."
        type="error"
        showIcon
        icon={<WarningOutlined />}
        style={style}
      />
    );
  }

  if (daysUntilExpiry <= 7) {
    return (
      <Alert
        message="Expiring Very Soon"
        description={`This batch expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Prioritize selling or disposing of this stock.`}
        type="error"
        showIcon
        icon={<WarningOutlined />}
        style={style}
      />
    );
  }

  if (daysUntilExpiry <= 30) {
    return (
      <Alert
        message="Expiring Soon"
        description={`This batch expires in ${daysUntilExpiry} days. Consider prioritizing this stock for sales.`}
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        style={style}
      />
    );
  }

  return null;
}
