'use client';

import { Button, Space } from 'antd';
import dayjs from 'dayjs';

interface DateRangePresetsProps {
  onChange: (fromDate: string, toDate: string) => void;
  disabled?: boolean;
}

export function DateRangePresets({ onChange, disabled }: DateRangePresetsProps) {
  const today = dayjs();

  const presets = [
    {
      label: 'Last 7 Days',
      value: () => {
        const from = today.subtract(7, 'day').format('YYYY-MM-DD');
        const to = today.format('YYYY-MM-DD');
        return { from, to };
      },
    },
    {
      label: 'Last 30 Days',
      value: () => {
        const from = today.subtract(30, 'day').format('YYYY-MM-DD');
        const to = today.format('YYYY-MM-DD');
        return { from, to };
      },
    },
    {
      label: 'Last 90 Days',
      value: () => {
        const from = today.subtract(90, 'day').format('YYYY-MM-DD');
        const to = today.format('YYYY-MM-DD');
        return { from, to };
      },
    },
    {
      label: 'This Month',
      value: () => {
        const from = today.startOf('month').format('YYYY-MM-DD');
        const to = today.format('YYYY-MM-DD');
        return { from, to };
      },
    },
    {
      label: 'This Year',
      value: () => {
        const from = today.startOf('year').format('YYYY-MM-DD');
        const to = today.format('YYYY-MM-DD');
        return { from, to };
      },
    },
    {
      label: 'YTD',
      value: () => {
        const from = today.startOf('year').format('YYYY-MM-DD');
        const to = today.format('YYYY-MM-DD');
        return { from, to };
      },
    },
  ];

  return (
    <Space wrap>
      {presets.map((preset) => (
        <Button
          key={preset.label}
          size="small"
          disabled={disabled}
          onClick={() => {
            const { from, to } = preset.value();
            onChange(from, to);
          }}
        >
          {preset.label}
        </Button>
      ))}
    </Space>
  );
}
