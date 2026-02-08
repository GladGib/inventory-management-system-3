'use client';

import React from 'react';
import Link from 'next/link';
import { Alert, Typography } from 'antd';
import { SwapOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface SupersessionBannerProps {
  /** The item that supersedes this one */
  supersededBy: {
    id: string;
    sku: string;
    name: string;
  };
}

/**
 * Alert banner shown at the top of item detail page when the item has been superseded.
 * Displays the replacement part SKU and name with a link to the new item.
 */
export function SupersessionBanner({ supersededBy }: SupersessionBannerProps) {
  return (
    <Alert
      type="warning"
      showIcon
      icon={<SwapOutlined />}
      style={{ marginBottom: 16 }}
      message={
        <span>
          This part has been superseded by{' '}
          <Link href={`/items/${supersededBy.id}`}>
            <Text strong style={{ color: '#d48806' }}>
              {supersededBy.sku}
            </Text>
          </Link>
          {' - '}
          {supersededBy.name}
        </span>
      }
      description={
        <Text type="secondary" style={{ fontSize: 12 }}>
          The replacement part should be used for new orders. Existing stock of
          this item may still be sold until depleted.
        </Text>
      }
    />
  );
}
