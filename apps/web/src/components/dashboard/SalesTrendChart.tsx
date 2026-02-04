'use client';

import { Card, Skeleton } from 'antd';
import { useSalesTrend } from '@/hooks/use-dashboard';
import { ChartPeriodSelector } from './ChartPeriodSelector';
import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import for code splitting
const Line = dynamic(() => import('@ant-design/charts').then((mod) => mod.Line), {
  ssr: false,
  loading: () => <Skeleton active paragraph={{ rows: 8 }} />,
});

interface SalesTrendChartProps {
  defaultPeriod?: number;
}

/**
 * SalesTrendChart - Line chart showing monthly sales trend
 *
 * Usage:
 * <SalesTrendChart defaultPeriod={12} />
 */
export function SalesTrendChart({ defaultPeriod = 12 }: SalesTrendChartProps) {
  const [period, setPeriod] = useState(defaultPeriod);
  const { data, isLoading } = useSalesTrend(period);

  // Parse month string (e.g., "2024-01") into readable format
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const chartData =
    data?.map((item) => ({
      date: formatMonth(item.month),
      value: item.sales,
    })) || [];

  // Check if there's any actual sales data (not all zeros)
  const hasData = chartData.some((item) => item.value > 0);

  const config = {
    data: chartData,
    xField: 'date',
    yField: 'value',
    smooth: true,
    point: {
      size: 4,
      shape: 'circle' as const,
    },
    yAxis: {
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
      formatter: (datum: { value: number }) => {
        return {
          name: 'Sales',
          value: `RM ${datum.value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        };
      },
    },
    color: '#1890ff',
  };

  return (
    <Card title="Sales Trend" extra={<ChartPeriodSelector value={period} onChange={setPeriod} />}>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : !hasData ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
          No sales data available
        </div>
      ) : (
        <Line {...config} />
      )}
    </Card>
  );
}
