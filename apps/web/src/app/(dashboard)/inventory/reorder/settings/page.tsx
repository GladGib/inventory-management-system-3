'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Typography,
  Button,
  Space,
  Table,
  InputNumber,
  Switch,
  Select,
  Input,
  message,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, SearchOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { useItems } from '@/hooks/use-items';
import { useBulkUpdateReorderSettings } from '@/hooks/use-reorder';
import { useContacts } from '@/hooks/use-contacts';
import type { Item } from '@/lib/items';

const { Title, Text } = Typography;

interface SettingsRow {
  itemId: string;
  sku: string;
  name: string;
  currentReorderLevel: number;
  currentReorderQty: number;
  reorderLevel: number;
  reorderQuantity: number;
  safetyStock: number;
  leadTimeDays: number;
  preferredVendorId?: string;
  autoReorder: boolean;
  isDirty: boolean;
}

export default function ReorderSettingsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [settingsMap, setSettingsMap] = useState<Record<string, SettingsRow>>({});

  const { data: itemsResponse, isLoading } = useItems({
    search: searchTerm,
    page,
    limit: 50,
    status: 'ACTIVE',
  });
  const { data: contactsData } = useContacts({ type: 'VENDOR' });
  const bulkUpdate = useBulkUpdateReorderSettings();

  const items = itemsResponse?.data || [];
  const vendors = contactsData?.data || [];

  // Initialize settings from items
  useEffect(() => {
    if (items.length > 0) {
      const newMap: Record<string, SettingsRow> = { ...settingsMap };
      for (const item of items) {
        if (!newMap[item.id]) {
          newMap[item.id] = {
            itemId: item.id,
            sku: item.sku,
            name: item.name,
            currentReorderLevel: item.reorderLevel || 0,
            currentReorderQty: item.reorderQty || 0,
            reorderLevel: item.reorderLevel || 0,
            reorderQuantity: item.reorderQty || 0,
            safetyStock: 0,
            leadTimeDays: 0,
            preferredVendorId: undefined,
            autoReorder: false,
            isDirty: false,
          };
        }
      }
      setSettingsMap(newMap);
    }
  }, [items]);

  const updateSetting = (
    itemId: string,
    field: string,
    value: number | string | boolean | undefined
  ) => {
    setSettingsMap((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
        isDirty: true,
      },
    }));
  };

  const handleSave = async () => {
    const dirtyItems = Object.values(settingsMap).filter((s) => s.isDirty);
    if (dirtyItems.length === 0) {
      message.info('No changes to save');
      return;
    }

    await bulkUpdate.mutateAsync({
      items: dirtyItems.map((s) => ({
        itemId: s.itemId,
        reorderLevel: s.reorderLevel,
        reorderQuantity: s.reorderQuantity,
        safetyStock: s.safetyStock,
        leadTimeDays: s.leadTimeDays,
        preferredVendorId: s.preferredVendorId,
        autoReorder: s.autoReorder,
      })),
    });

    // Mark all as clean
    setSettingsMap((prev) => {
      const updated = { ...prev };
      for (const key of Object.keys(updated)) {
        updated[key] = { ...updated[key], isDirty: false };
      }
      return updated;
    });
  };

  const dirtyCount = Object.values(settingsMap).filter((s) => s.isDirty).length;

  const columns: TableColumnsType<Item> = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 110,
      fixed: 'left',
      render: (sku: string) => <Text strong>{sku}</Text>,
    },
    {
      title: 'Item Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Reorder Level',
      key: 'reorderLevel',
      width: 120,
      render: (_, record: Item) => (
        <InputNumber
          min={0}
          size="small"
          style={{ width: '100%' }}
          value={settingsMap[record.id]?.reorderLevel ?? 0}
          onChange={(val) => updateSetting(record.id, 'reorderLevel', val || 0)}
        />
      ),
    },
    {
      title: 'Reorder Qty',
      key: 'reorderQuantity',
      width: 120,
      render: (_, record: Item) => (
        <InputNumber
          min={0}
          size="small"
          style={{ width: '100%' }}
          value={settingsMap[record.id]?.reorderQuantity ?? 0}
          onChange={(val) => updateSetting(record.id, 'reorderQuantity', val || 0)}
        />
      ),
    },
    {
      title: 'Safety Stock',
      key: 'safetyStock',
      width: 110,
      render: (_, record: Item) => (
        <InputNumber
          min={0}
          size="small"
          style={{ width: '100%' }}
          value={settingsMap[record.id]?.safetyStock ?? 0}
          onChange={(val) => updateSetting(record.id, 'safetyStock', val || 0)}
        />
      ),
    },
    {
      title: 'Lead Time (days)',
      key: 'leadTimeDays',
      width: 120,
      render: (_, record: Item) => (
        <InputNumber
          min={0}
          size="small"
          style={{ width: '100%' }}
          value={settingsMap[record.id]?.leadTimeDays ?? 0}
          onChange={(val) => updateSetting(record.id, 'leadTimeDays', val || 0)}
        />
      ),
    },
    {
      title: 'Preferred Vendor',
      key: 'preferredVendorId',
      width: 180,
      render: (_, record: Item) => (
        <Select
          size="small"
          style={{ width: '100%' }}
          allowClear
          placeholder="Select vendor"
          value={settingsMap[record.id]?.preferredVendorId}
          onChange={(val) => updateSetting(record.id, 'preferredVendorId', val)}
          options={vendors.map((v) => ({
            value: v.id,
            label: v.displayName,
          }))}
        />
      ),
    },
    {
      title: 'Auto-Reorder',
      key: 'autoReorder',
      width: 100,
      align: 'center',
      render: (_, record: Item) => (
        <Switch
          size="small"
          checked={settingsMap[record.id]?.autoReorder ?? false}
          onChange={(checked) => updateSetting(record.id, 'autoReorder', checked)}
        />
      ),
    },
  ];

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
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/inventory/reorder')}>
            Back
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            Reorder Settings
          </Title>
        </Space>
        <Space>
          {dirtyCount > 0 && <Text type="warning">{dirtyCount} unsaved changes</Text>}
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={bulkUpdate.isPending}
            disabled={dirtyCount === 0}
          >
            Save Changes
          </Button>
        </Space>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search items by SKU or name..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            style={{ width: 300 }}
            allowClear
          />
        </div>

        <Table
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={isLoading}
          rowClassName={(record) =>
            settingsMap[record.id]?.isDirty ? 'ant-table-row-selected' : ''
          }
          pagination={{
            current: page,
            total: itemsResponse?.meta?.total || 0,
            pageSize: 50,
            onChange: setPage,
            showTotal: (total) => `Total ${total} items`,
          }}
          scroll={{ x: 1200 }}
          size="small"
        />
      </Card>
    </div>
  );
}
