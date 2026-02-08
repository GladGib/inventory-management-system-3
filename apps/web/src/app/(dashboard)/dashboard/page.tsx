'use client';

import { Typography } from 'antd';
import { DashboardGrid } from '@/components/dashboard';

const { Title } = Typography;

export default function DashboardPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Dashboard
      </Title>
      <DashboardGrid />
    </div>
  );
}
