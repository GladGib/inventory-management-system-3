'use client';

import { useState } from 'react';
import { Dropdown, Button, message } from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  DownOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { reportsService } from '@/lib/reports';
import { downloadBlob } from '@/hooks/use-reports';

interface ExportDropdownProps {
  reportType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: Record<string, any>;
  disabled?: boolean;
  reportName?: string;
}

export function ExportDropdown({
  reportType,
  params,
  disabled = false,
  reportName = 'report',
}: ExportDropdownProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    setLoading(true);
    try {
      const blob = await reportsService.exportReport(reportType, format, params);
      const date = new Date().toISOString().split('T')[0];
      const filename = `${reportName}-${date}.${format === 'xlsx' ? 'xlsx' : 'html'}`;
      downloadBlob(blob, filename);
      message.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      message.error('Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  const items: MenuProps['items'] = [
    {
      key: 'xlsx',
      label: 'Export to Excel',
      icon: <FileExcelOutlined style={{ color: '#217346' }} />,
      onClick: () => handleExport('xlsx'),
    },
    {
      key: 'pdf',
      label: 'Export to PDF',
      icon: <FilePdfOutlined style={{ color: '#FF4D4F' }} />,
      onClick: () => handleExport('pdf'),
    },
  ];

  return (
    <Dropdown menu={{ items }} trigger={['click']} disabled={disabled || loading}>
      <Button loading={loading} icon={<DownloadOutlined />}>
        Export <DownOutlined />
      </Button>
    </Dropdown>
  );
}
