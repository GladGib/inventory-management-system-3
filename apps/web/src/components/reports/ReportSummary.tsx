'use client';

import { Card, Col, Row, Statistic } from 'antd';
import { ReactNode } from 'react';

export interface SummaryItem {
  title: string;
  value: number | string;
  precision?: number;
  prefix?: ReactNode;
  suffix?: ReactNode;
  valueStyle?: React.CSSProperties;
}

interface ReportSummaryProps {
  items: SummaryItem[];
  loading?: boolean;
}

export function ReportSummary({ items, loading }: ReportSummaryProps) {
  return (
    <Card loading={loading} style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]}>
        {items.map((item, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Statistic
              title={item.title}
              value={item.value}
              precision={item.precision}
              prefix={item.prefix}
              suffix={item.suffix}
              valueStyle={item.valueStyle}
            />
          </Col>
        ))}
      </Row>
    </Card>
  );
}
