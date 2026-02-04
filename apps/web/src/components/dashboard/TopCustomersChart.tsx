'use client';

import { Card, Skeleton } from 'antd';
import { useTopCustomers } from '@/hooks/use-dashboard';
import dynamic from 'next/dynamic';

// Dynamic import for code splitting
const Bar = dynamic(() => import('@ant-design/charts').then((mod) => mod.Bar), {
  ssr: false,
  loading: () => <Skeleton active paragraph={{ rows: 8 }} />,
});

interface TopCustomersChartProps {
  limit?: number;
}

/**
 * TopCustomersChart - Horizontal bar chart for top customers
 *
 * Usage:
 * <TopCustomersChart limit={10} />
 */
export function TopCustomersChart({ limit = 10 }: TopCustomersChartProps) {
  const { data, isLoading } = useTopCustomers(limit);

  const chartData =
    data
      ?.map((topCustomer) => {
        const customerName =
          topCustomer.customer?.displayName ||
          topCustomer.customer?.companyName ||
          'Unknown Customer';
        return {
          customer: customerName.length > 30 ? customerName.substring(0, 30) + '...' : customerName,
          value: topCustomer.totalSpent,
          orders: topCustomer.invoiceCount,
        };
      })
      .filter((item) => item.value > 0) || [];

  const config = {
    data: chartData,
    xField: 'value',
    yField: 'customer',
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
      formatter: (datum: { customer: string; value: number; orders: number }) => {
        return {
          name: datum.customer,
          value: `RM ${datum.value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${datum.orders} orders)`,
        };
      },
    },
    color: '#722ed1',
    legend: false as const,
  };

  return (
    <Card title="Top Customers">
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : chartData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
          No customer data available
        </div>
      ) : (
        <Bar {...config} />
      )}
    </Card>
  );
}
