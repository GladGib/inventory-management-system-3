'use client';

import { useState } from 'react';
import { Input, Button, Space, Tag, Typography, InputNumber, Tabs, Row, Col } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

interface BulkSerialInputProps {
  value?: string[];
  onChange?: (serials: string[]) => void;
}

export function BulkSerialInput({ value = [], onChange }: BulkSerialInputProps) {
  const [textInput, setTextInput] = useState('');
  const [prefix, setPrefix] = useState('');
  const [rangeStart, setRangeStart] = useState<number | null>(1);
  const [rangeEnd, setRangeEnd] = useState<number | null>(10);
  const [padLength, setPadLength] = useState<number | null>(4);

  const handleTextParse = () => {
    const parsed = textInput
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const unique = [...new Set([...value, ...parsed])];
    onChange?.(unique);
    setTextInput('');
  };

  const handleRangeGenerate = () => {
    if (rangeStart === null || rangeEnd === null) return;

    const serials: string[] = [];
    for (let i = rangeStart; i <= rangeEnd; i++) {
      const num = padLength ? String(i).padStart(padLength, '0') : String(i);
      serials.push(`${prefix}${num}`);
    }

    const unique = [...new Set([...value, ...serials])];
    onChange?.(unique);
  };

  const handleRemove = (serial: string) => {
    onChange?.(value.filter((s) => s !== serial));
  };

  const handleClearAll = () => {
    onChange?.([]);
  };

  const tabItems = [
    {
      key: 'list',
      label: 'Paste/Type List',
      children: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <TextArea
            rows={4}
            placeholder="Enter serial numbers (one per line, or comma/semicolon separated)"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          />
          <Button type="primary" onClick={handleTextParse} disabled={!textInput.trim()}>
            Add Serial Numbers
          </Button>
        </Space>
      ),
    },
    {
      key: 'range',
      label: 'Generate Range',
      children: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Row gutter={12}>
            <Col span={8}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                Prefix
              </Text>
              <Input placeholder="SN-" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
            </Col>
            <Col span={5}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                From
              </Text>
              <InputNumber
                min={1}
                value={rangeStart}
                onChange={setRangeStart}
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={5}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                To
              </Text>
              <InputNumber
                min={rangeStart || 1}
                value={rangeEnd}
                onChange={setRangeEnd}
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={6}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                Pad Digits
              </Text>
              <InputNumber
                min={0}
                max={10}
                value={padLength}
                onChange={setPadLength}
                style={{ width: '100%' }}
              />
            </Col>
          </Row>
          {rangeStart !== null && rangeEnd !== null && (
            <Text type="secondary">
              Preview: {prefix}
              {padLength ? String(rangeStart).padStart(padLength, '0') : rangeStart} ... {prefix}
              {padLength ? String(rangeEnd).padStart(padLength, '0') : rangeEnd} (
              {rangeEnd - rangeStart + 1} serials)
            </Text>
          )}
          <Button type="primary" onClick={handleRangeGenerate}>
            Generate Serial Numbers
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Tabs items={tabItems} size="small" />

      {value.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <Text strong>
              {value.length} serial number{value.length !== 1 ? 's' : ''}
            </Text>
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={handleClearAll}
            >
              Clear All
            </Button>
          </div>
          <div
            style={{
              maxHeight: 200,
              overflow: 'auto',
              border: '1px solid #d9d9d9',
              borderRadius: 6,
              padding: 8,
            }}
          >
            {value.map((serial) => (
              <Tag
                key={serial}
                closable
                onClose={() => handleRemove(serial)}
                style={{ marginBottom: 4 }}
              >
                {serial}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
