'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Typography,
  Button,
  Space,
  Descriptions,
  Statistic,
  Row,
  Col,
  Select,
  Spin,
  Alert,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useItem } from '@/hooks/use-items';
import {
  useBOM,
  useUpdateBOM,
  useCreateComposite,
  useBOMAvailability,
} from '@/hooks/use-composite';
import { useWarehouses } from '@/hooks/use-inventory';
import { BOMEditor, type BOMComponentRow } from '@/components/composite/BOMEditor';
import { AvailabilityIndicator } from '@/components/composite/AvailabilityIndicator';

const { Title } = Typography;

export default function BOMPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.id as string;

  const [components, setComponents] = useState<BOMComponentRow[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | undefined>();
  const [isNewComposite, setIsNewComposite] = useState(false);

  const { data: item, isLoading: itemLoading } = useItem(itemId);
  const { data: bom, isLoading: bomLoading, error: bomError } = useBOM(itemId);
  const { data: availability, isLoading: availLoading } = useBOMAvailability(
    itemId,
    selectedWarehouseId
  );
  const { data: warehouses } = useWarehouses();

  const createComposite = useCreateComposite();
  const updateBOM = useUpdateBOM();

  // Populate components from existing BOM
  useEffect(() => {
    if (bom?.components) {
      setComponents(
        bom.components.map((c, index) => ({
          key: c.id || `comp-${index}`,
          componentItemId: c.componentItemId,
          componentSku: c.componentItem.sku,
          componentName: c.componentItem.name,
          componentUnit: c.componentItem.unit,
          componentCostPrice: Number(c.componentItem.costPrice),
          quantity: Number(c.quantity),
          notes: c.notes || '',
          sortOrder: c.sortOrder,
        }))
      );
      setIsNewComposite(false);
    } else if (bomError) {
      setIsNewComposite(true);
    }
  }, [bom, bomError]);

  const handleSave = async () => {
    const bomData = {
      components: components.map((c, index) => ({
        componentItemId: c.componentItemId,
        quantity: c.quantity,
        notes: c.notes || undefined,
        sortOrder: index,
      })),
    };

    if (isNewComposite) {
      await createComposite.mutateAsync({
        itemId,
        assemblyMethod: 'MANUAL',
        components: bomData.components,
      });
      setIsNewComposite(false);
    } else {
      await updateBOM.mutateAsync({
        itemId,
        data: bomData,
      });
    }
  };

  const isSaving = createComposite.isPending || updateBOM.isPending;

  if (itemLoading || bomLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const totalComponentCost = components.reduce(
    (sum, c) => sum + (c.componentCostPrice || 0) * c.quantity,
    0
  );
  const sellingPrice = item ? Number(item.sellingPrice) : 0;
  const margin = sellingPrice > 0 ? ((sellingPrice - totalComponentCost) / sellingPrice) * 100 : 0;

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
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(`/items/${itemId}`)}>
            Back to Item
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            Bill of Materials
          </Title>
        </Space>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={isSaving}
          disabled={components.length === 0}
        >
          {isNewComposite ? 'Create Composite Item' : 'Save BOM'}
        </Button>
      </div>

      {/* Item Info */}
      {item && (
        <Card style={{ marginBottom: 16 }}>
          <Descriptions column={{ xs: 1, sm: 2, md: 4 }}>
            <Descriptions.Item label="SKU">{item.sku}</Descriptions.Item>
            <Descriptions.Item label="Name">{item.name}</Descriptions.Item>
            <Descriptions.Item label="Type">{item.type}</Descriptions.Item>
            <Descriptions.Item label="Selling Price">
              RM {Number(item.sellingPrice).toFixed(2)}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {isNewComposite && (
        <Alert
          type="info"
          message="This item is not yet marked as composite. Add components below and save to create the BOM."
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* BOM Editor */}
      <Card title="Components" style={{ marginBottom: 16 }}>
        <BOMEditor components={components} onChange={setComponents} excludeItemId={itemId} />
      </Card>

      {/* Cost Summary & Availability */}
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card title="Cost Summary" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="Component Cost"
                  value={totalComponentCost}
                  prefix="RM"
                  precision={2}
                />
              </Col>
              <Col span={8}>
                <Statistic title="Selling Price" value={sellingPrice} prefix="RM" precision={2} />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Margin"
                  value={margin}
                  suffix="%"
                  precision={1}
                  valueStyle={{
                    color: margin > 0 ? '#3f8600' : margin < 0 ? '#cf1322' : undefined,
                  }}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          {!isNewComposite && (
            <>
              <div style={{ marginBottom: 8 }}>
                <Select
                  placeholder="Filter by warehouse"
                  style={{ width: 200 }}
                  allowClear
                  value={selectedWarehouseId}
                  onChange={setSelectedWarehouseId}
                  options={warehouses?.map((w) => ({
                    value: w.id,
                    label: w.name,
                  }))}
                />
              </div>
              <AvailabilityIndicator availability={availability} isLoading={availLoading} />
            </>
          )}
        </Col>
      </Row>
    </div>
  );
}
