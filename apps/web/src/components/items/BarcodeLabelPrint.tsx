'use client';

import React, { useState } from 'react';
import { Button, Modal, Radio, Space, Spin, Typography, message } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { useBatchBarcodes } from '@/hooks/use-items';
import type { BatchBarcodeItem } from '@/lib/items';

const { Text, Title } = Typography;

export interface BarcodeLabelPrintProps {
  /** Array of items to print labels for */
  items: Array<{ id: string; sku: string; name: string; sellingPrice: number }>;
  /** Button trigger element (optional - defaults to "Print Labels" button) */
  trigger?: React.ReactNode;
}

type LabelSize = 'thermal' | 'a4';

export function BarcodeLabelPrint({ items, trigger }: BarcodeLabelPrintProps) {
  const [open, setOpen] = useState(false);
  const [labelSize, setLabelSize] = useState<LabelSize>('thermal');
  const [barcodeData, setBarcodeData] = useState<BatchBarcodeItem[]>([]);
  const batchBarcodes = useBatchBarcodes();

  const handleOpen = async () => {
    setOpen(true);
    if (items.length > 0) {
      try {
        const data = await batchBarcodes.mutateAsync({
          itemIds: items.map((i) => i.id),
          format: 'code128',
          labelTemplate: labelSize,
        });
        setBarcodeData(data);
      } catch {
        // Error handled by mutation hook
      }
    }
  };

  const handlePrint = () => {
    if (barcodeData.length === 0) {
      message.warning('No barcode data to print');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      message.error('Could not open print window. Please allow pop-ups.');
      return;
    }

    const isA4 = labelSize === 'a4';

    const labelsHtml = barcodeData
      .map(
        (item) => `
        <div class="label">
          <div class="item-name">${escapeHtml(item.name)}</div>
          <div class="barcode-svg">${item.svg}</div>
          <div class="item-sku">${escapeHtml(item.sku)}</div>
          <div class="item-price">RM ${item.sellingPrice.toFixed(2)}</div>
        </div>
      `,
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode Labels</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; }

          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }

          .print-controls {
            padding: 16px;
            text-align: center;
            border-bottom: 1px solid #eee;
          }
          .print-controls button {
            padding: 8px 24px;
            font-size: 14px;
            cursor: pointer;
            background: #1677ff;
            color: white;
            border: none;
            border-radius: 6px;
            margin: 0 8px;
          }
          .print-controls button.close-btn {
            background: #666;
          }

          ${
            isA4
              ? `
            /* A4 Grid Layout */
            .labels-container {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 4px;
              padding: 10mm;
              max-width: 210mm;
              margin: 0 auto;
            }
            .label {
              border: 1px dashed #ccc;
              padding: 6px;
              text-align: center;
              page-break-inside: avoid;
              height: 38mm;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .item-name {
              font-size: 9px;
              font-weight: bold;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              max-width: 60mm;
              margin-bottom: 2px;
            }
            .barcode-svg { margin: 2px 0; }
            .barcode-svg svg { max-width: 55mm; max-height: 15mm; }
            .item-sku { font-size: 8px; color: #666; }
            .item-price { font-size: 10px; font-weight: bold; margin-top: 1px; }
          `
              : `
            /* Thermal Label Layout (2x1 inch = 50.8mm x 25.4mm) */
            .labels-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 2mm;
              padding: 4mm;
            }
            .label {
              width: 50.8mm;
              height: 25.4mm;
              border: 1px dashed #ccc;
              padding: 2mm;
              text-align: center;
              page-break-inside: avoid;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .item-name {
              font-size: 8px;
              font-weight: bold;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              max-width: 46mm;
              margin-bottom: 1px;
            }
            .barcode-svg { margin: 1px 0; }
            .barcode-svg svg { max-width: 44mm; max-height: 12mm; }
            .item-sku { font-size: 7px; color: #666; }
            .item-price { font-size: 9px; font-weight: bold; }
          `
          }
        </style>
      </head>
      <body>
        <div class="print-controls no-print">
          <button onclick="window.print()">Print Labels</button>
          <button class="close-btn" onclick="window.close()">Close</button>
        </div>
        <div class="labels-container">
          ${labelsHtml}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <>
      {trigger ? (
        <span onClick={handleOpen} style={{ cursor: 'pointer' }}>
          {trigger}
        </span>
      ) : (
        <Button icon={<PrinterOutlined />} onClick={handleOpen}>
          Print Labels
        </Button>
      )}

      <Modal
        title="Print Barcode Labels"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handlePrint}
        okText="Open Print Preview"
        okButtonProps={{
          icon: <PrinterOutlined />,
          disabled: barcodeData.length === 0 || batchBarcodes.isPending,
        }}
        width={520}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>Label Size</Text>
            <div style={{ marginTop: 8 }}>
              <Radio.Group
                value={labelSize}
                onChange={(e) => setLabelSize(e.target.value)}
                optionType="button"
                buttonStyle="solid"
                options={[
                  { label: 'Thermal (2x1")', value: 'thermal' },
                  { label: 'A4 Sheet (Grid)', value: 'a4' },
                ]}
              />
            </div>
          </div>

          <div>
            <Text strong>Items ({items.length})</Text>
            <div
              style={{
                marginTop: 8,
                maxHeight: 200,
                overflowY: 'auto',
                border: '1px solid #f0f0f0',
                borderRadius: 6,
                padding: 8,
              }}
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    borderBottom: '1px solid #fafafa',
                  }}
                >
                  <Text ellipsis style={{ maxWidth: 300 }}>
                    {item.sku} - {item.name}
                  </Text>
                  <Text type="secondary">RM {item.sellingPrice.toFixed(2)}</Text>
                </div>
              ))}
            </div>
          </div>

          {batchBarcodes.isPending && (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <Spin />
              <Text style={{ display: 'block', marginTop: 8 }}>
                Generating barcodes...
              </Text>
            </div>
          )}

          {barcodeData.length > 0 && !batchBarcodes.isPending && (
            <div style={{ textAlign: 'center' }}>
              <Text type="success">
                {barcodeData.length} barcode(s) ready to print
              </Text>
            </div>
          )}
        </Space>
      </Modal>
    </>
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
