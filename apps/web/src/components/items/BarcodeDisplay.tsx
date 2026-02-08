'use client';

import React from 'react';
import { Spin, Typography } from 'antd';
import { useBarcode } from '@/hooks/use-items';

const { Text } = Typography;

export interface BarcodeDisplayProps {
  /** The item ID to fetch barcode for (uses API-generated SVG) */
  itemId?: string;
  /** The value to encode (SKU or barcode string) - used for client-side rendering */
  value?: string;
  /** Barcode format: code128, ean13, qrcode */
  format?: string;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Whether to show the text value below the barcode */
  showValue?: boolean;
}

export function BarcodeDisplay({
  itemId,
  value,
  format = 'code128',
  width = 200,
  height = 80,
  showValue = true,
}: BarcodeDisplayProps) {
  const { data, isLoading, error } = useBarcode(itemId || '', !!itemId);

  // If we have an itemId, use API-generated barcode
  if (itemId) {
    if (isLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
          <Spin size="small" />
        </div>
      );
    }

    if (error || !data?.svg) {
      return (
        <div style={{ padding: 8, textAlign: 'center' }}>
          <Text type="secondary">Failed to load barcode</Text>
        </div>
      );
    }

    return (
      <div
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <div
          dangerouslySetInnerHTML={{ __html: data.svg }}
          style={{
            maxWidth: width,
            maxHeight: height,
            overflow: 'hidden',
          }}
        />
      </div>
    );
  }

  // Client-side fallback using react-barcode (if value is provided)
  if (value) {
    // We use a dynamic import approach to only load react-barcode when needed
    return <ClientBarcode value={value} width={width} height={height} showValue={showValue} />;
  }

  return null;
}

/** Client-side barcode rendering using react-barcode */
function ClientBarcode({
  value,
  width,
  height,
  showValue,
}: {
  value: string;
  width: number;
  height: number;
  showValue: boolean;
}) {
  // Use dynamic import to avoid SSR issues
  const [BarcodeComponent, setBarcodeComponent] = React.useState<React.ComponentType<any> | null>(null);

  React.useEffect(() => {
    import('react-barcode').then((mod) => {
      setBarcodeComponent(() => mod.default);
    });
  }, []);

  if (!BarcodeComponent) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
        <Spin size="small" />
      </div>
    );
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <BarcodeComponent
        value={value}
        width={Math.max(1, Math.round(width / 200))}
        height={height}
        displayValue={showValue}
        fontSize={12}
        margin={4}
      />
    </div>
  );
}
