'use client';

import { Tag, Tooltip } from 'antd';
import { SyncOutlined } from '@ant-design/icons';

interface CoreChargeIndicatorProps {
  hasCore: boolean;
  coreCharge: number;
  style?: React.CSSProperties;
}

/**
 * Badge showing "Core: RM XX.XX" on item cards/lists.
 * Indicates the item has a returnable core with a deposit charge.
 */
export function CoreChargeIndicator({
  hasCore,
  coreCharge,
  style,
}: CoreChargeIndicatorProps) {
  if (!hasCore) return null;

  return (
    <Tooltip title="This item has a returnable core deposit. Customers are charged a core fee and can return the old part for a refund.">
      <Tag
        icon={<SyncOutlined />}
        color="orange"
        style={{ cursor: 'help', ...style }}
      >
        Core: RM {Number(coreCharge).toFixed(2)}
      </Tag>
    </Tooltip>
  );
}
