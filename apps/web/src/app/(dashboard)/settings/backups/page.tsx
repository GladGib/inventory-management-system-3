'use client';

import { useState } from 'react';
import {
  Card,
  Table,
  Typography,
  Space,
  Button,
  Modal,
  message,
  Alert,
  Statistic,
  Row,
  Col,
  Tag,
  Popconfirm,
} from 'antd';
import {
  CloudUploadOutlined,
  CloudDownloadOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { api } from '@/lib/api';
import type { ColumnsType } from 'antd/es/table';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

interface BackupInfo {
  filename: string;
  date: string;
  size: number;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function BackupsPage() {
  const queryClient = useQueryClient();
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);

  const { data: backups, isLoading, refetch } = useQuery<BackupInfo[]>({
    queryKey: ['backups'],
    queryFn: async () => {
      const response = await api.get('/admin/backups');
      return response.data;
    },
  });

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/admin/backup');
      return response.data;
    },
    onSuccess: (data) => {
      message.success(`Backup created: ${data.filename}`);
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: () => {
      message.error('Failed to create backup');
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: async (filename: string) => {
      const response = await api.post('/admin/restore', { filename });
      return response.data;
    },
    onSuccess: (data) => {
      message.success(data.message || 'Backup restored successfully');
      setRestoreModalOpen(false);
      setSelectedBackup(null);
    },
    onError: () => {
      message.error('Failed to restore backup');
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: async (filename: string) => {
      await api.delete(`/admin/backups/${filename}`);
    },
    onSuccess: () => {
      message.success('Backup deleted');
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: () => {
      message.error('Failed to delete backup');
    },
  });

  const handleRestore = (backup: BackupInfo) => {
    setSelectedBackup(backup);
    setRestoreModalOpen(true);
  };

  const confirmRestore = () => {
    if (selectedBackup) {
      restoreBackupMutation.mutate(selectedBackup.filename);
    }
  };

  const totalSize = (backups || []).reduce((acc, b) => acc + b.size, 0);

  const columns: ColumnsType<BackupInfo> = [
    {
      title: 'Filename',
      dataIndex: 'filename',
      key: 'filename',
      render: (val: string) => (
        <Space>
          <DatabaseOutlined style={{ color: '#1890ff' }} />
          <Text strong style={{ fontSize: 13 }}>{val}</Text>
        </Space>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 220,
      render: (val: string) => (
        <Space direction="vertical" size={0}>
          <Text>{dayjs(val).format('YYYY-MM-DD HH:mm:ss')}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(val).fromNow()}</Text>
        </Space>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: (val: number) => <Tag>{formatFileSize(val)}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: BackupInfo) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CloudDownloadOutlined />}
            onClick={() => handleRestore(record)}
          >
            Restore
          </Button>
          <Popconfirm
            title="Delete this backup?"
            description="This action cannot be undone."
            onConfirm={() => deleteBackupMutation.mutate(record.filename)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              loading={deleteBackupMutation.isPending}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            Backups
          </Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<CloudUploadOutlined />}
              onClick={() => createBackupMutation.mutate()}
              loading={createBackupMutation.isPending}
            >
              Create Backup
            </Button>
          </Space>
        </div>

        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <Statistic
                title="Total Backups"
                value={backups?.length || 0}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Total Size"
                value={formatFileSize(totalSize)}
                prefix={<CloudUploadOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Latest Backup"
                value={
                  backups && backups.length > 0
                    ? dayjs(backups[0].date).fromNow()
                    : 'Never'
                }
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Alert
          type="info"
          message="Backup Information"
          description="Backups contain all organization data including items, contacts, sales orders, invoices, and purchase orders exported as JSON. Restoring a backup will upsert records -- existing records are updated and missing records are recreated."
          showIcon
        />

        <Card>
          <Table
            columns={columns}
            dataSource={backups || []}
            rowKey="filename"
            loading={isLoading}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `${total} backups`,
            }}
            size="small"
            locale={{
              emptyText: (
                <Space direction="vertical" style={{ padding: 32 }}>
                  <DatabaseOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                  <Text type="secondary">No backups found. Create your first backup above.</Text>
                </Space>
              ),
            }}
          />
        </Card>
      </Space>

      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            Restore Backup
          </Space>
        }
        open={restoreModalOpen}
        onCancel={() => {
          setRestoreModalOpen(false);
          setSelectedBackup(null);
        }}
        onOk={confirmRestore}
        confirmLoading={restoreBackupMutation.isPending}
        okText="Restore"
        okButtonProps={{ danger: true }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            type="warning"
            message="Warning: Destructive Operation"
            description="Restoring a backup will overwrite existing records with the backup data. This operation cannot be easily undone. Please ensure you have a current backup before proceeding."
            showIcon
          />

          {selectedBackup && (
            <Card size="small">
              <Space direction="vertical" size={4}>
                <Text strong>File: {selectedBackup.filename}</Text>
                <Text type="secondary">
                  Created: {dayjs(selectedBackup.date).format('YYYY-MM-DD HH:mm:ss')} (
                  {dayjs(selectedBackup.date).fromNow()})
                </Text>
                <Text type="secondary">Size: {formatFileSize(selectedBackup.size)}</Text>
              </Space>
            </Card>
          )}
        </Space>
      </Modal>
    </div>
  );
}
