'use client';

import { Card, Skeleton } from 'antd';
import { useTopItems } from '@/hooks/use-dashboard';
import dynamic from 'next/dynamic';

// Dynamic import for code splitting
const Bar = dynamic(() => import('@ant-design/charts').then((mod) => mod.Bar), {
  ssr: false,
  loading: () => <Skeleton active paragraph={{ rows: 8 }} />,
});

interface TopItemsChartProps {
  limit?: number;
}

/**
 * TopItemsChart - Horizontal bar chart for top selling items
 *
 * Usage:
 * <TopItemsChart limit={10} />
 */
export function TopItemsChart({ limit = 10 }: TopItemsChartProps) {
  const { data, isLoading } = useTopItems(limit);

  const chartData =
    data?.map((topItem) => {
      const itemName = topItem.item?.name || 'Unknown Item';
      return {
        item: itemName.length > 30 ? itemName.substring(0, 30) + '...' : itemName,
        value: topItem.revenue,
        quantity: topItem.quantitySold,
      };
    }).filter((item) => item.value > 0) || [];

  const config = {
    data: chartData,
    xField: 'value',
    yField: 'item',
    xAxis: {
      min: 0,
      label: {
        formatter: (v: string) => {
          const num = parseFloat(v);
          if (num >= 1000000) {
            return `RM ${(num / 1000000).toFixed(1)}M`;
          } else if (num >= 1000) {
            return `RM ${(num / 1000).toFixed(0)}K`;
          }
          return `RM ${num}`;
        },
      },
    },
    tooltip: {
      formatter: (datum: { item: string; value: number; quantity: number }) => {
        return {
          name: datum.item,
          value: `RM ${datum.value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${datum.quantity} sold)`,
        };
      },
    },
    color: '#52c41a',
    legend: false as const,
  };

  return (
    <Card title="Top Selling Items">
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : chartData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
          No sales data available
        </div>
      ) : (
        <Bar {...config} />
      )}
    </Card>
  );
}
