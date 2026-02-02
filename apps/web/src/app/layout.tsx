import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { QueryProvider } from '@/providers/query-provider';
import { AntdProvider } from '@/providers/antd-provider';
import { AuthProvider } from '@/providers/auth-provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'IMS - Inventory Management System',
    template: '%s | IMS',
  },
  description:
    'Inventory Management System for Malaysian SMEs - Auto Parts, Hardware & Spare Parts',
  keywords: ['inventory', 'management', 'auto parts', 'hardware', 'spare parts', 'malaysia'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <QueryProvider>
            <AntdProvider>
              <AuthProvider>{children}</AuthProvider>
            </AntdProvider>
          </QueryProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
