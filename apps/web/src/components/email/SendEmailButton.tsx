'use client';

import { useState } from 'react';
import { Button, message, Tooltip } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import {
  useSendInvoiceEmail,
  useSendPaymentReceipt,
  useSendOrderConfirmation,
  useSendPOToVendor,
} from '@/hooks/use-email';

type DocumentType = 'invoice' | 'payment' | 'order' | 'po';

interface SendEmailButtonProps {
  documentType: DocumentType;
  documentId: string;
  recipientEmail?: string;
  size?: 'small' | 'middle' | 'large';
  type?: 'default' | 'primary' | 'link' | 'text' | 'dashed';
  showIcon?: boolean;
  showText?: boolean;
  disabled?: boolean;
}

const documentLabels: Record<DocumentType, string> = {
  invoice: 'Invoice',
  payment: 'Payment Receipt',
  order: 'Order Confirmation',
  po: 'Purchase Order',
};

export function SendEmailButton({
  documentType,
  documentId,
  recipientEmail,
  size = 'middle',
  type = 'default',
  showIcon = true,
  showText = true,
  disabled = false,
}: SendEmailButtonProps) {
  const [sending, setSending] = useState(false);

  const sendInvoice = useSendInvoiceEmail();
  const sendPayment = useSendPaymentReceipt();
  const sendOrder = useSendOrderConfirmation();
  const sendPO = useSendPOToVendor();

  const handleSend = async () => {
    if (!recipientEmail && documentType !== 'invoice') {
      message.warning('No email address configured for this recipient');
    }

    setSending(true);
    try {
      let result;
      switch (documentType) {
        case 'invoice':
          result = await sendInvoice.mutateAsync(documentId);
          break;
        case 'payment':
          result = await sendPayment.mutateAsync(documentId);
          break;
        case 'order':
          result = await sendOrder.mutateAsync(documentId);
          break;
        case 'po':
          result = await sendPO.mutateAsync(documentId);
          break;
      }

      if (result.success) {
        message.success(`${documentLabels[documentType]} sent successfully`);
      } else {
        message.error(result.error || 'Failed to send email');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
      message.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const buttonContent = (
    <>
      {showIcon && <MailOutlined />}
      {showText && <span style={{ marginLeft: showIcon ? 4 : 0 }}>Send Email</span>}
    </>
  );

  const tooltipTitle = recipientEmail
    ? `Send ${documentLabels[documentType]} to ${recipientEmail}`
    : `Send ${documentLabels[documentType]}`;

  return (
    <Tooltip title={tooltipTitle}>
      <Button
        type={type}
        size={size}
        onClick={handleSend}
        loading={sending}
        disabled={disabled}
        icon={showIcon && !showText ? <MailOutlined /> : undefined}
      >
        {showText ? buttonContent : null}
      </Button>
    </Tooltip>
  );
}
