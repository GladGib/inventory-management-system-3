'use client';

import { Progress, Typography, Tooltip } from 'antd';

const { Text } = Typography;

interface StockCoverageBarProps {
  currentStock: number;
  reorderLevel: number;
  maxStock?: number;
}

export function StockCoverageBar({ currentStock, reorderLevel, maxStock }: StockCoverageBarProps) {
  const max = maxStock || reorderLevel * 3;
  const percentage = max > 0 ? Math.min(100, (currentStock / max) * 100) : 0;

  let status: 'success' | 'normal' | 'exception' = 'success';
  let strokeColor = '#52c41a';

  if (currentStock <= 0) {
    status = 'exception';
    strokeColor = '#ff4d4f';
  } else if (currentStock <= reorderLevel) {
    status = 'exception';
    strokeColor = '#faad14';
  } else if (currentStock <= reorderLevel * 1.5) {
    status = 'normal';
    strokeColor = '#1890ff';
  }

  return (
    <Tooltip title={`Current: ${currentStock} | Reorder at: ${reorderLevel}`}>
      <div style={{ minWidth: 120 }}>
        <Progress
          percent={Math.round(percentage)}
          size="small"
          strokeColor={strokeColor}
          status={status}
          format={() => <Text style={{ fontSize: 11 }}>{currentStock}</Text>}
        />
      </div>
    </Tooltip>
  );
}
