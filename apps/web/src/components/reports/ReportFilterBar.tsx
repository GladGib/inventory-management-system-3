'use client';

import { Card, DatePicker, Space, Typography } from 'antd';
import { DateRangePresets } from './DateRangePresets';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface ReportFilterBarProps {
  fromDate: string;
  toDate: string;
  onChange: (fromDate: string, toDate: string) => void;
  loading?: boolean;
}

export function ReportFilterBar({ fromDate, toDate, onChange, loading }: ReportFilterBarProps) {
  const handleRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      onChange(dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD'));
    }
  };

  const handlePresetChange = (from: string, to: string) => {
    onChange(from, to);
  };

  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap align="center">
          <Text strong>Date Range:</Text>
          <RangePicker
            value={[dayjs(fromDate), dayjs(toDate)]}
            onChange={handleRangeChange}
            disabled={loading}
            format="YYYY-MM-DD"
            allowClear={false}
          />
        </Space>
        <Space wrap>
          <Text type="secondary">Quick Select:</Text>
          <DateRangePresets onChange={handlePresetChange} disabled={loading} />
        </Space>
      </Space>
    </Card>
  );
}
