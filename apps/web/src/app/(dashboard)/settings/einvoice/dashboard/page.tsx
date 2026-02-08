'use client';

import { useState } from 'react';
import {
  Card,
  Table,
  Typography,
  Breadcrumb,
  Row,
  Col,
  Statistic,
  Select,
  DatePicker,
  Space,
  Button,
  Skeleton,
  Empty,
  Modal,
  Input,
  message,
} from 'antd';
import {
  HomeOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  StopOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
  useEInvoiceDashboard,
  useEInvoiceSubmissions,
  useCancelEInvoice,
} from '@/hooks/use-einvoice';
import { EInvoiceStatusTag, SubmissionDetailDrawer } from '@/components/einvoice';
import type { EInvoiceSubmission, SubmissionFilters } from '@/lib/einvoice';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

export default function EInvoiceComplianceDashboardPage() {
  const [filters, setFilters] = useState<SubmissionFilters>({
    page: 1,
    limit: 15,
  });
  const [selectedSubmission, setSelectedSubmission] = useState<EInvoiceSubmission | null>(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelInvoiceId, setCancelInvoiceId] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const { data: dashboard, isLoading: dashLoading } = useEInvoiceDashboard();
  const { data: submissions, isLoading: subsLoading } = useEInvoiceSubmissions(filters);
  const cancelMutation = useCancelEInvoice();

  const handleStatusFilter = (value: string | undefined) => {
    setFilters((prev) => ({ ...prev, status: value, page: 1 }));
  };

  const handleDateFilter = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setFilters((prev) => ({
        ...prev,
        fromDate: dates[0]!.format('YYYY-MM-DD'),
        toDate: dates[1]!.format('YYYY-MM-DD'),
        page: 1,
      }));
    } else {
      setFilters((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { fromDate, toDate, ...rest } = prev;
        return { ...rest, page: 1 };
      });
    }
  };

  const handleCancel = async () => {
    if (!cancelReason || cancelReason.length < 10) {
      message.error('Please provide a reason (minimum 10 characters)');
      return;
    }
    try {
      await cancelMutation.mutateAsync({
        invoiceId: cancelInvoiceId,
        reason: cancelReason,
      });
      message.success('e-Invoice cancellation submitted');
      setCancelModalVisible(false);
      setCancelReason('');
      setCancelInvoiceId('');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Cancellation failed';
      message.error(errorMsg);
    }
  };

  const columns: ColumnsType<EInvoiceSubmission> = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 130,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      ellipsis: true,
    },
    {
      title: 'Amount',
      dataIndex: 'invoiceTotal',
      key: 'invoiceTotal',
      width: 130,
      align: 'right',
      render: (value) => `RM ${(value || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Submitted',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 150,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => <EInvoiceStatusTag status={status} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setSelectedSubmission(record)}
          />
          {(record.status === 'VALIDATED' || record.status === 'SUBMITTED') && (
            <Button
              type="text"
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => {
                setCancelInvoiceId(record.invoiceId);
                setCancelModalVisible(true);
              }}
            >
              Cancel
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { href: '/', title: <HomeOutlined /> },
          {
            href: '/settings',
            title: (
              <>
                <SettingOutlined /> <span>Settings</span>
              </>
            ),
          },
          { href: '/settings/einvoice', title: 'e-Invoice' },
          { title: 'Compliance Dashboard' },
        ]}
      />

      <Title level={4} style={{ marginBottom: 24 }}>
        <SafetyCertificateOutlined style={{ marginRight: 8 }} />
        e-Invoice Compliance Dashboard
      </Title>

      {/* KPI Cards */}
      {dashLoading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small">
              <Statistic
                title="Total Submitted"
                value={dashboard?.summary.totalSubmitted || 0}
                prefix={<SyncOutlined />}
                valueStyle={{ color: '#1677ff' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small">
              <Statistic
                title="Validated"
                value={dashboard?.summary.validated || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small">
              <Statistic
                title="Rejected"
                value={dashboard?.summary.rejected || 0}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small">
              <Statistic
                title="Pending"
                value={dashboard?.summary.pending || 0}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small">
              <Statistic
                title="Cancelled"
                value={dashboard?.summary.cancelled || 0}
                prefix={<StopOutlined />}
                valueStyle={{ color: '#d9d9d9' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small">
              <Statistic
                title="Awaiting Submission"
                value={dashboard?.pendingSubmission || 0}
                prefix={<ReloadOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Text strong>Filter:</Text>
          <Select
            placeholder="Status"
            allowClear
            style={{ width: 160 }}
            onChange={handleStatusFilter}
            options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'SUBMITTED', label: 'Submitted' },
              { value: 'VALIDATED', label: 'Validated' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
          <RangePicker onChange={handleDateFilter} format="YYYY-MM-DD" />
        </Space>
      </Card>

      {/* Submissions Table */}
      <Card title="Submissions">
        {subsLoading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : submissions?.data.length === 0 ? (
          <Empty description="No e-Invoice submissions found" />
        ) : (
          <Table
            columns={columns}
            dataSource={submissions?.data}
            rowKey="id"
            loading={subsLoading}
            pagination={{
              current: filters.page || 1,
              pageSize: filters.limit || 15,
              total: submissions?.meta.total || 0,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} submissions`,
              onChange: (page, pageSize) => {
                setFilters((prev) => ({ ...prev, page, limit: pageSize }));
              },
            }}
            size="small"
          />
        )}
      </Card>

      {/* Detail Drawer */}
      <SubmissionDetailDrawer
        submission={selectedSubmission}
        open={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
      />

      {/* Cancel Modal */}
      <Modal
        title="Cancel e-Invoice"
        open={cancelModalVisible}
        onCancel={() => {
          setCancelModalVisible(false);
          setCancelReason('');
        }}
        onOk={handleCancel}
        confirmLoading={cancelMutation.isPending}
        okText="Cancel e-Invoice"
        okButtonProps={{ danger: true }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            Cancellation is only allowed within 72 hours of validation. Please provide a reason.
          </Text>
        </div>
        <TextArea
          rows={4}
          placeholder="Enter the reason for cancellation (minimum 10 characters)"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}
