'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Card,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Switch,
  Button,
  Typography,
  Space,
  Table,
  Tag,
  Popconfirm,
  Modal,
  Tooltip,
  Skeleton,
  Upload,
  message,
} from 'antd';
import {
  SaveOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  usePriceList,
  useUpdatePriceList,
  useUpdatePriceListItem,
  useRemovePriceListItem,
  useBulkUpdatePrices,
  useImportPriceListItems,
} from '@/hooks/use-price-lists';
import { PriceListItemModal } from '@/components/price-list/PriceListItemModal';
import type { PriceListItem, UpdatePriceListDto } from '@/lib/price-lists';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function PriceListDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form] = Form.useForm();
  const { data: priceList, isLoading } = usePriceList(id);
  const updateMutation = useUpdatePriceList();
  const updateItemMutation = useUpdatePriceListItem();
  const removeItemMutation = useRemovePriceListItem();
  const bulkUpdateMutation = useBulkUpdatePrices();
  const importMutation = useImportPriceListItems();

  const [addItemsVisible, setAddItemsVisible] = useState(false);
  const [bulkUpdateVisible, setBulkUpdateVisible] = useState(false);
  const [bulkForm] = Form.useForm();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editMinQty, setEditMinQty] = useState<number>(1);

  const markupType = Form.useWatch('markupType', form);

  useEffect(() => {
    if (priceList) {
      form.setFieldsValue({
        name: priceList.name,
        description: priceList.description,
        type: priceList.type,
        markupType: priceList.markupType,
        markupValue: priceList.markupValue,
        isDefault: priceList.isDefault,
        effectiveDates:
          priceList.effectiveFrom || priceList.effectiveTo
            ? [
                priceList.effectiveFrom ? dayjs(priceList.effectiveFrom) : null,
                priceList.effectiveTo ? dayjs(priceList.effectiveTo) : null,
              ]
            : undefined,
      });
    }
  }, [priceList, form]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSaveDetails = async (values: Record<string, any>) => {
    const dto: UpdatePriceListDto = {
      name: values.name,
      description: values.description,
      type: values.type,
      markupType: values.markupType,
      markupValue: values.markupValue || 0,
      isDefault: values.isDefault || false,
      effectiveFrom: values.effectiveDates?.[0]
        ? values.effectiveDates[0].toISOString()
        : undefined,
      effectiveTo: values.effectiveDates?.[1] ? values.effectiveDates[1].toISOString() : undefined,
    };

    updateMutation.mutate({ id, data: dto });
  };

  const handleInlineEdit = (record: PriceListItem) => {
    setEditingItemId(record.id);
    setEditPrice(record.customPrice);
    setEditMinQty(record.minQuantity);
  };

  const handleInlineSave = (record: PriceListItem) => {
    updateItemMutation.mutate(
      {
        priceListId: id,
        itemId: record.id,
        data: { customPrice: editPrice, minQuantity: editMinQty },
      },
      { onSuccess: () => setEditingItemId(null) }
    );
  };

  const handleBulkUpdate = (values: {
    adjustmentType: 'PERCENTAGE' | 'FIXED';
    adjustmentValue: number;
  }) => {
    bulkUpdateMutation.mutate(
      { priceListId: id, data: values },
      { onSuccess: () => setBulkUpdateVisible(false) }
    );
  };

  const handleImportCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim());
        if (lines.length < 2) {
          message.error('CSV file must have a header row and at least one data row');
          return;
        }

        const header = lines[0]
          .toLowerCase()
          .split(',')
          .map((h) => h.trim());
        const skuIdx = header.indexOf('sku');
        const priceIdx =
          header.indexOf('price') !== -1 ? header.indexOf('price') : header.indexOf('customprice');
        const qtyIdx =
          header.indexOf('minquantity') !== -1
            ? header.indexOf('minquantity')
            : header.indexOf('min_quantity');

        if (skuIdx === -1 || priceIdx === -1) {
          message.error('CSV must have "sku" and "price" columns');
          return;
        }

        const data = lines
          .slice(1)
          .map((line) => {
            const cols = line.split(',').map((c) => c.trim());
            return {
              sku: cols[skuIdx],
              customPrice: parseFloat(cols[priceIdx]),
              minQuantity: qtyIdx !== -1 ? parseFloat(cols[qtyIdx]) || 1 : 1,
            };
          })
          .filter((d) => d.sku && !isNaN(d.customPrice));

        if (data.length === 0) {
          message.error('No valid data rows found in CSV');
          return;
        }

        importMutation.mutate({ priceListId: id, data });
      } catch {
        message.error('Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
    return false; // Prevent auto-upload
  };

  const itemColumns: ColumnsType<PriceListItem> = [
    {
      title: 'Item',
      key: 'item',
      render: (_: unknown, record) => (
        <div>
          <Text strong>{record.item?.name || 'Unknown'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.item?.sku}
          </Text>
        </div>
      ),
    },
    {
      title: 'Standard Price',
      key: 'standardPrice',
      width: 140,
      render: (_: unknown, record) =>
        record.item?.sellingPrice != null
          ? `RM ${Number(record.item.sellingPrice).toFixed(2)}`
          : '-',
    },
    {
      title: 'Custom Price',
      key: 'customPrice',
      width: 160,
      render: (_: unknown, record) => {
        if (editingItemId === record.id) {
          return (
            <InputNumber
              size="small"
              value={editPrice}
              onChange={(v) => setEditPrice(v || 0)}
              min={0}
              step={0.01}
              addonBefore="RM"
              style={{ width: 140 }}
            />
          );
        }
        const diff = record.item?.sellingPrice
          ? record.customPrice - Number(record.item.sellingPrice)
          : 0;
        return (
          <Space>
            <Text strong>RM {record.customPrice.toFixed(2)}</Text>
            {diff !== 0 && (
              <Tag color={diff > 0 ? 'red' : 'green'} style={{ fontSize: 11 }}>
                {diff > 0 ? '+' : ''}
                {diff.toFixed(2)}
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Min Qty',
      key: 'minQuantity',
      width: 120,
      render: (_: unknown, record) => {
        if (editingItemId === record.id) {
          return (
            <InputNumber
              size="small"
              value={editMinQty}
              onChange={(v) => setEditMinQty(v || 1)}
              min={1}
              style={{ width: 80 }}
            />
          );
        }
        return record.minQuantity;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record) => {
        if (editingItemId === record.id) {
          return (
            <Space>
              <Button
                size="small"
                type="primary"
                onClick={() => handleInlineSave(record)}
                loading={updateItemMutation.isPending}
              >
                Save
              </Button>
              <Button size="small" onClick={() => setEditingItemId(null)}>
                Cancel
              </Button>
            </Space>
          );
        }
        return (
          <Space>
            <Tooltip title="Edit price">
              <Button type="text" size="small" onClick={() => handleInlineEdit(record)}>
                Edit
              </Button>
            </Tooltip>
            <Popconfirm
              title="Remove this item?"
              onConfirm={() => removeItemMutation.mutate({ priceListId: id, itemId: record.id })}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (!priceList) {
    return (
      <div>
        <Text>Price list not found.</Text>
      </div>
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/settings/price-lists')}>
          Back
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          {priceList.name}
        </Title>
        <Tag color={priceList.type === 'SALES' ? 'blue' : 'green'}>{priceList.type}</Tag>
        <Tag color={priceList.status === 'ACTIVE' ? 'success' : 'default'}>{priceList.status}</Tag>
      </Space>

      {/* Price List Details Form */}
      <Card title="Price List Details" style={{ marginBottom: 24 }}>
        <Form form={form} layout="vertical" onFinish={onSaveDetails} style={{ maxWidth: 700 }}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={2} />
          </Form.Item>

          <Space size={16} align="start">
            <Form.Item name="type" label="Type" rules={[{ required: true }]}>
              <Select
                style={{ width: 150 }}
                options={[
                  { label: 'Sales', value: 'SALES' },
                  { label: 'Purchase', value: 'PURCHASE' },
                ]}
              />
            </Form.Item>

            <Form.Item name="markupType" label="Markup Type" rules={[{ required: true }]}>
              <Select
                style={{ width: 180 }}
                options={[
                  { label: 'Percentage (%)', value: 'PERCENTAGE' },
                  { label: 'Fixed Amount (RM)', value: 'FIXED' },
                ]}
              />
            </Form.Item>

            <Form.Item name="markupValue" label="Markup Value">
              <InputNumber
                style={{ width: 150 }}
                addonAfter={markupType === 'PERCENTAGE' ? '%' : 'RM'}
                step={markupType === 'PERCENTAGE' ? 1 : 0.01}
              />
            </Form.Item>
          </Space>

          <Form.Item name="effectiveDates" label="Effective Date Range">
            <DatePicker.RangePicker style={{ width: '100%', maxWidth: 400 }} />
          </Form.Item>

          <Form.Item name="isDefault" label="Default" valuePropName="checked">
            <Switch checkedChildren="Yes" unCheckedChildren="No" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={updateMutation.isPending}
            >
              Save Changes
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Items Table */}
      <Card
        title={`Price List Items (${priceList.items.length})`}
        extra={
          <Space>
            <Upload accept=".csv" showUploadList={false} beforeUpload={handleImportCSV}>
              <Button icon={<UploadOutlined />} loading={importMutation.isPending}>
                Import CSV
              </Button>
            </Upload>
            <Button
              icon={<PercentageOutlined />}
              onClick={() => setBulkUpdateVisible(true)}
              disabled={priceList.items.length === 0}
            >
              Bulk Update
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddItemsVisible(true)}>
              Add Items
            </Button>
          </Space>
        }
      >
        <Table
          columns={itemColumns}
          dataSource={priceList.items}
          rowKey="id"
          pagination={{ pageSize: 20, showSizeChanger: true }}
          size="middle"
          locale={{ emptyText: 'No items added to this price list yet.' }}
        />
      </Card>

      {/* Add Items Modal */}
      <PriceListItemModal
        priceListId={id}
        open={addItemsVisible}
        onClose={() => setAddItemsVisible(false)}
      />

      {/* Bulk Update Modal */}
      <Modal
        title="Bulk Price Update"
        open={bulkUpdateVisible}
        onCancel={() => setBulkUpdateVisible(false)}
        onOk={() => bulkForm.submit()}
        confirmLoading={bulkUpdateMutation.isPending}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Adjust all item prices in this price list. Use negative values to decrease.
        </Text>
        <Form
          form={bulkForm}
          layout="vertical"
          onFinish={handleBulkUpdate}
          initialValues={{ adjustmentType: 'PERCENTAGE', adjustmentValue: 0 }}
        >
          <Form.Item name="adjustmentType" label="Adjustment Type" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'Percentage (%)', value: 'PERCENTAGE' },
                { label: 'Fixed Amount (RM)', value: 'FIXED' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="adjustmentValue"
            label="Adjustment Value"
            rules={[{ required: true, message: 'Enter adjustment value' }]}
            extra="Use negative value to decrease prices"
          >
            <InputNumber style={{ width: '100%' }} step={0.5} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
