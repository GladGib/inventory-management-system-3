'use client';

import { Spin, Typography, Empty } from 'antd';
import { QrcodeOutlined } from '@ant-design/icons';
import { useEInvoiceQRCode } from '@/hooks/use-einvoice';

const { Text } = Typography;

interface EInvoiceQRCodeProps {
  invoiceId: string;
  size?: number;
  showTitle?: boolean;
}

export function EInvoiceQRCode({ invoiceId, size = 200, showTitle = true }: EInvoiceQRCodeProps) {
  const { data, isLoading, error } = useEInvoiceQRCode(invoiceId);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <Spin tip="Generating QR code..." />
      </div>
    );
  }

  if (error || !data?.qrCode) {
    return (
      <Empty
        image={<QrcodeOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
        description={
          <Text type="secondary">
            QR code not available. The e-Invoice must be validated first.
          </Text>
        }
      />
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      {showTitle && (
        <Text strong style={{ display: 'block', marginBottom: 12 }}>
          e-Invoice QR Code
        </Text>
      )}
      <img src={data.qrCode} alt="e-Invoice QR Code" style={{ width: size, height: size }} />
      <div style={{ marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Scan to verify on MyInvois
        </Text>
      </div>
    </div>
  );
}
