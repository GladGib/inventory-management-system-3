'use client';

import { Card, Typography, Empty, Spin } from 'antd';
import type { DemandForecast } from '@/lib/reorder';

const { Text } = Typography;

interface DemandForecastChartProps {
  forecast?: DemandForecast;
  isLoading?: boolean;
}

export function DemandForecastChart({ forecast, isLoading }: DemandForecastChartProps) {
  if (isLoading) {
    return (
      <Card title="Demand Forecast">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spin />
        </div>
      </Card>
    );
  }

  if (!forecast || (forecast.historicalData.length === 0 && forecast.forecasts.length === 0)) {
    return (
      <Card title="Demand Forecast">
        <Empty description="Not enough historical data for forecasting" />
      </Card>
    );
  }

  const allData = [
    ...forecast.historicalData.map((d) => ({
      period: d.period,
      quantity: d.quantity,
      type: 'historical' as const,
    })),
    ...forecast.forecasts.map((f) => ({
      period: f.period,
      quantity: f.forecastQty,
      type: 'forecast' as const,
    })),
  ];

  const maxQty = Math.max(...allData.map((d) => d.quantity), 1);

  return (
    <Card title="Demand Forecast" extra={<Text type="secondary">Method: {forecast.method}</Text>}>
      <div style={{ overflowX: 'auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 4,
            height: 200,
            minWidth: allData.length * 50,
            padding: '0 8px',
          }}
        >
          {allData.map((d) => {
            const height = maxQty > 0 ? (d.quantity / maxQty) * 160 : 0;
            const isForecasted = d.type === 'forecast';

            return (
              <div
                key={d.period}
                style={{
                  flex: 1,
                  minWidth: 36,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 10 }}>{Math.round(d.quantity)}</Text>
                <div
                  style={{
                    width: '80%',
                    height: Math.max(height, 4),
                    backgroundColor: isForecasted ? '#91caff' : '#1677ff',
                    borderRadius: 4,
                    border: isForecasted ? '2px dashed #1677ff' : 'none',
                    transition: 'height 0.3s',
                  }}
                />
                <Text
                  style={{
                    fontSize: 9,
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                    height: 30,
                    overflow: 'hidden',
                  }}
                  type={isForecasted ? 'secondary' : undefined}
                >
                  {d.period}
                </Text>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 16,
            justifyContent: 'center',
            marginTop: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 12,
                height: 12,
                backgroundColor: '#1677ff',
                borderRadius: 2,
              }}
            />
            <Text style={{ fontSize: 12 }}>Historical</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 12,
                height: 12,
                backgroundColor: '#91caff',
                border: '2px dashed #1677ff',
                borderRadius: 2,
              }}
            />
            <Text style={{ fontSize: 12 }}>Forecast</Text>
          </div>
        </div>
      </div>
    </Card>
  );
}
