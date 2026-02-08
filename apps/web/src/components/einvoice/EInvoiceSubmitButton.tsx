'use client';

import { Button, Modal, message } from 'antd';
import { CloudUploadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useSubmitEInvoice } from '@/hooks/use-einvoice';

const { confirm } = Modal;

interface EInvoiceSubmitButtonProps {
  invoiceId: string;
  invoiceNumber?: string;
  eInvoiceStatus?: string | null;
  invoiceStatus?: string;
  size?: 'small' | 'middle' | 'large';
}

export function EInvoiceSubmitButton({
  invoiceId,
  invoiceNumber,
  eInvoiceStatus,
  invoiceStatus,
  size = 'middle',
}: EInvoiceSubmitButtonProps) {
  const submitMutation = useSubmitEInvoice();

  // Don't show if already validated
  if (eInvoiceStatus === 'VALIDATED') {
    return null;
  }

  // Don't show for draft/void invoices
  if (invoiceStatus === 'DRAFT' || invoiceStatus === 'VOID') {
    return null;
  }

  const isSubmitting = submitMutation.isPending;
  const isResubmit = eInvoiceStatus === 'REJECTED';

  const handleSubmit = () => {
    confirm({
      title: isResubmit ? 'Re-submit e-Invoice' : 'Submit e-Invoice to MyInvois',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>
            {isResubmit
              ? `Re-submit invoice ${invoiceNumber || ''} to MyInvois?`
              : `Submit invoice ${invoiceNumber || ''} to MyInvois for validation?`}
          </p>
          <p style={{ color: '#666', fontSize: 13 }}>
            This will generate a UBL 2.1 XML document and submit it to the LHDN MyInvois platform.
          </p>
        </div>
      ),
      okText: isResubmit ? 'Re-submit' : 'Submit',
      onOk: async () => {
        try {
          await submitMutation.mutateAsync(invoiceId);
          message.success('e-Invoice submitted successfully to MyInvois');
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Submission failed';
          message.error(`Failed to submit e-Invoice: ${errorMsg}`);
        }
      },
    });
  };

  return (
    <Button
      icon={<CloudUploadOutlined />}
      onClick={handleSubmit}
      loading={isSubmitting}
      size={size}
      type={isResubmit ? 'default' : 'primary'}
    >
      {isResubmit ? 'Re-submit e-Invoice' : 'Submit e-Invoice'}
    </Button>
  );
}
