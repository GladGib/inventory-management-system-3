'use client';

import { useState } from 'react';
import { Layout } from 'antd';
import { Sidebar, Header } from '@/components/layout';
import { PageErrorBoundary } from '@/components/PageErrorBoundary';

const { Content } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout
        style={{
          marginLeft: collapsed ? 80 : 260,
          transition: 'margin-left 0.2s',
        }}
      >
        <Header collapsed={collapsed} />
        <Content className="page-container">
          <PageErrorBoundary>{children}</PageErrorBoundary>
        </Content>
      </Layout>
    </Layout>
  );
}
