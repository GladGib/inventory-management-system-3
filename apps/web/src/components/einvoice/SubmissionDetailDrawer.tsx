'use client';

import { Drawer, Descriptions, Typography, Alert, Divider, Space } from 'antd';
import dayjs from 'dayjs';
import { EInvoiceStatusTag } from './EInvoiceStatusTag';
import { EInvoiceQRCode } from './EInvoiceQRCode';
import type { EInvoiceSubmission } from '@/lib/einvoice';

const { Text, Paragraph } = Typography;

interface SubmissionDetailDrawerProps {
  submission: EInvoiceSubmission | null;
  open: boolean;
  onClose: () => void;
}

export function SubmissionDetailDrawer({ submission, open, onClose }: SubmissionDetailDrawerProps) {
  if (!submission) return null;

  return (
    <Drawer title="e-Invoice Submission Details" open={open} onClose={onClose} width={520}>
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Invoice Number">
          <Text strong>{submission.invoiceNumber}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Customer">{submission.customerName}</Descriptions.Item>
        <Descriptions.Item label="Invoice Total">
          RM{' '}
          {submission.invoiceTotal?.toLocaleString('en-MY', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <EInvoiceStatusTag status={submission.status} />
        </Descriptions.Item>
        <Descriptions.Item label="Submitted At">
          {submission.submittedAt
            ? dayjs(submission.submittedAt).format('DD/MM/YYYY HH:mm:ss')
            : '-'}
        </Descriptions.Item>
        {submission.validatedAt && (
          <Descriptions.Item label="Validated At">
            {dayjs(submission.validatedAt).format('DD/MM/YYYY HH:mm:ss')}
          </Descriptions.Item>
        )}
        {submission.cancelledAt && (
          <Descriptions.Item label="Cancelled At">
            {dayjs(submission.cancelledAt).format('DD/MM/YYYY HH:mm:ss')}
          </Descriptions.Item>
        )}
        {submission.submissionUuid && (
          <Descriptions.Item label="Submission UUID">
            <Space>
              <Text copyable={{ text: submission.submissionUuid }} style={{ fontSize: 12 }}>
                {submission.submissionUuid.substring(0, 20)}...
              </Text>
            </Space>
          </Descriptions.Item>
        )}
        {submission.documentUuid && (
          <Descriptions.Item label="Document UUID">
            <Space>
              <Text copyable={{ text: submission.documentUuid }} style={{ fontSize: 12 }}>
                {submission.documentUuid.substring(0, 20)}...
              </Text>
            </Space>
          </Descriptions.Item>
        )}
        {submission.longId && (
          <Descriptions.Item label="Long ID">
            <Text style={{ fontSize: 12, wordBreak: 'break-all' }}>{submission.longId}</Text>
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Retry Count">{submission.retryCount}</Descriptions.Item>
      </Descriptions>

      {submission.lastError && (
        <>
          <Divider />
          <Alert type="error" message="Last Error" description={submission.lastError} showIcon />
        </>
      )}

      {submission.rejectionReasons && Object.keys(submission.rejectionReasons).length > 0 && (
        <>
          <Divider />
          <Alert
            type="warning"
            message="Rejection/Cancellation Reasons"
            description={
              <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(submission.rejectionReasons, null, 2)}
              </pre>
            }
            showIcon
          />
        </>
      )}

      {(submission.status === 'VALIDATED' || submission.status === 'SUBMITTED') && (
        <>
          <Divider />
          <EInvoiceQRCode invoiceId={submission.invoiceId} size={180} />
        </>
      )}

      {submission.qrCodeUrl && (
        <>
          <Divider />
          <Paragraph>
            <Text strong>Validation URL:</Text>
          </Paragraph>
          <Paragraph>
            <a href={submission.qrCodeUrl} target="_blank" rel="noopener noreferrer">
              {submission.qrCodeUrl}
            </a>
          </Paragraph>
        </>
      )}
    </Drawer>
  );
}
