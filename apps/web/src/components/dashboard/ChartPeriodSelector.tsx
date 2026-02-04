'use client';

import { Select } from 'antd';

interface ChartPeriodSelectorProps {
  value: number;
  onChange: (value: number) => void;
  style?: React.CSSProperties;
}

/**
 * ChartPeriodSelector - Dropdown to select chart time period
 *
 * Usage:
 * <ChartPeriodSelector value={period} onChange={setPeriod} />
 */
export function ChartPeriodSelector({ value, onChange, style }: ChartPeriodSelectorProps) {
  const options = [
    { label: 'Last 6 months', value: 6 },
    { label: 'Last 12 months', value: 12 },
    { label: 'Last 24 months', value: 24 },
  ];

  return (
    <Select value={value} onChange={onChange} options={options} style={{ width: 150, ...style }} />
  );
}
