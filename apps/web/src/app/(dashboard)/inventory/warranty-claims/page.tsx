'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Select,
  DatePicker,
  Tag,
  Modal,
  Form,
  Input,
  type TableColumnsType,
  type TablePaginationConfig,
} from 'antd';
import { FilterOutlined, EditOutlined } from '@ant-design/icons';
import { useWarrantyClaims, useUpdateWarrantyClaim } from '@/hooks/use-serials';
import type { WarrantyClaim, WarrantyClaimQueryParams, ClaimStatus } from '@/lib/serial';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const claimStatusOptions: { value: ClaimStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
];

const claimStatusColors: Record<ClaimStatus, string> = {
  PENDING: 'orange',
  APPROVED: 'blue',
  REJECTED: 'red',
  IN_PROGRESS: 'cyan',
  RESOLVED: 'green',
};

export default function WarrantyClaimsPage() {
  const [filters, setFilters] = useState<WarrantyClaimQueryParams>({
    page: 1,
    limit: 25,
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState<WarrantyClaim | null>(null);
  const [editForm] = Form.useForm();

  const queryParams = useMemo(() => ({ ...filters }), [filters]);
  const { data, isLoading, isFetching } = useWarrantyClaims(queryParams);
  const updateMutation = useUpdateWarrantyClaim();

  const columns: TableColumnsType<WarrantyClaim> = [
    {
      title: 'Claim #',
      dataIndex: 'claimNumber',
      key: 'claimNumber',
      width: 150,
      render: (num: string) => <Text strong>{num}</Text>,
    },
    {
      title: 'Serial #',
      key: 'serialNumber',
      width: 160,
      render: (_, record) =>
        record.serialNumber ? (
          <Link href={`/inventory/serials/${record.serialNumberId}`} style={{ fontWeight: 500 }}>
            {record.serialNumber.serialNumber}
          </Link>
        ) : (
          '-'
        ),
    },
    {
      title: 'Item',
      key: 'item',
      render: (_, record) =>
        record.serialNumber?.item ? (
          <Space direction="vertical" size={0}>
            <Text>{record.serialNumber.item.sku}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.serialNumber.item.name}
            </Text>
          </Space>
        ) : (
          '-'
        ),
    },
    {
      title: 'Customer',
      key: 'customer',
      width: 160,
      render: (_, record) =>
        record.serialNumber?.soldTo ? record.serialNumber.soldTo.displayName : '-',
    },
    {
      title: 'Claim Date',
      dataIndex: 'claimDate',
      key: 'claimDate',
      width: 130,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: ClaimStatus) => (
        <Tag color={claimStatusColors[status]}>{status.replace('_', ' ')}</Tag>
      ),
    },
    {
      title: 'Issue',
      dataIndex: 'issueDescription',
      key: 'issueDescription',
      ellipsis: true,
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, record) => (
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={() => {
            setEditingClaim(record);
            editForm.setFieldsValue({
              status: record.status,
              resolution: record.resolution,
            });
            setEditModalOpen(true);
          }}
        />
      ),
    },
  ];

  const handleUpdateClaim = async (values: { status: ClaimStatus; resolution?: string }) => {
    if (!editingClaim) return;
    await updateMutation.mutateAsync({
      id: editingClaim.id,
      data: {
        status: values.status,
        resolution: values.resolution,
        resolvedDate: values.status === 'RESOLVED' ? new Date().toISOString() : undefined,
      },
    });
    setEditModalOpen(false);
    setEditingClaim(null);
    editForm.resetFields();
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setFilters((prev) => ({
      ...prev,
      page: pagination.current || 1,
      limit: pagination.pageSize || 25,
    }));
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Warranty Claims
        </Title>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Select
              placeholder="Status"
              style={{ width: 150 }}
              allowClear
              value={filters.status}
              onChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  status: value,
                  page: 1,
                }))
              }
              options={claimStatusOptions}
            />
            <RangePicker
              onChange={(dates) => {
                setFilters((prev) => ({
                  ...prev,
                  fromDate: dates?.[0]?.toISOString(),
                  toDate: dates?.[1]?.toISOString(),
                  page: 1,
                }));
              }}
            />
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                setFilters({ page: 1, limit: 25 });
              }}
            >
              Reset
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading || isFetching}
          onChange={handleTableChange}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total: data?.meta?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} claims`,
          }}
        />
      </Card>

      {/* Edit Claim Modal */}
      <Modal
        title={`Update Claim: ${editingClaim?.claimNumber || ''}`}
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingClaim(null);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        confirmLoading={updateMutation.isPending}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateClaim}>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select options={claimStatusOptions} />
          </Form.Item>
          <Form.Item name="resolution" label="Resolution">
            <Input.TextArea rows={4} placeholder="Describe the resolution..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
