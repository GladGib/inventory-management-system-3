'use client';

import { ConfigProvider, App as AntdApp } from 'antd';
import enUS from 'antd/locale/en_US';
import { type ReactNode } from 'react';
import theme from '@/theme/config';

interface AntdProviderProps {
  children: ReactNode;
}

export function AntdProvider({ children }: AntdProviderProps) {
  return (
    <ConfigProvider theme={theme} locale={enUS}>
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
