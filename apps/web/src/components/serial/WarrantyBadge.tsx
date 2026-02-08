'use client';

import dayjs from 'dayjs';
import { Tag, Tooltip } from 'antd';
import { SafetyCertificateOutlined, CloseCircleOutlined } from '@ant-design/icons';

interface WarrantyBadgeProps {
  warrantyEndDate: string | null | undefined;
  warrantyMonths: number | null | undefined;
}

export function WarrantyBadge({ warrantyEndDate, warrantyMonths }: WarrantyBadgeProps) {
  if (!warrantyEndDate && !warrantyMonths) {
    return <Tag color="default">No Warranty</Tag>;
  }

  if (!warrantyEndDate) {
    return (
      <Tag color="blue" icon={<SafetyCertificateOutlined />}>
        {warrantyMonths}mo Warranty
      </Tag>
    );
  }

  const endDate = dayjs(warrantyEndDate);
  const now = dayjs();
  const daysLeft = endDate.diff(now, 'day');

  if (daysLeft <= 0) {
    return (
      <Tooltip title={`Expired on ${endDate.format('DD/MM/YYYY')}`}>
        <Tag color="default" icon={<CloseCircleOutlined />}>
          Warranty Expired
        </Tag>
      </Tooltip>
    );
  }

  let color = 'green';
  if (daysLeft <= 30) color = 'orange';
  if (daysLeft <= 7) color = 'red';

  return (
    <Tooltip title={`Expires: ${endDate.format('DD/MM/YYYY')} (${daysLeft} days remaining)`}>
      <Tag color={color} icon={<SafetyCertificateOutlined />}>
        Warranty Active ({daysLeft}d)
      </Tag>
    </Tooltip>
  );
}
