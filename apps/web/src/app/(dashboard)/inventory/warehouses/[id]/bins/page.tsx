'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Button,
  Typography,
  Space,
  Tag,
  Row,
  Col,
  Collapse,
  Empty,
  Spin,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Popconfirm,
  Dropdown,
  Breadcrumb,
  Tooltip,
  type MenuProps,
} from 'antd';
import {
  PlusOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  AppstoreOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useWarehouse } from '@/hooks/use-inventory';
import {
  useZones,
  useBins,
  useCreateZone,
  useUpdateZone,
  useDeleteZone,
  useCreateBin,
  useUpdateBin,
  useDeleteBin,
} from '@/hooks/use-bins';
import { BinCard } from '@/components/inventory/BinCard';
import { BinStockDrawer } from '@/components/inventory/BinStockDrawer';
import type { Bin, WarehouseZone } from '@/types/models';
import { BinType } from '@/types/enums';
import type { BinQueryParams } from '@/lib/bins';

const { Title, Text } = Typography;

const BIN_TYPE_OPTIONS = [
  { value: BinType.STORAGE, label: 'Storage' },
  { value: BinType.PICKING, label: 'Picking' },
  { value: BinType.RECEIVING, label: 'Receiving' },
  { value: BinType.SHIPPING, label: 'Shipping' },
  { value: BinType.STAGING, label: 'Staging' },
];

export default function WarehouseBinsPage() {
  const params = useParams();
  const router = useRouter();
  const warehouseId = params.id as string;

  // State
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [binModalOpen, setBinModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<WarehouseZone | null>(null);
  const [editingBin, setEditingBin] = useState<Bin | null>(null);
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string | undefined>();
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<BinType | undefined>();

  const [zoneForm] = Form.useForm();
  const [binForm] = Form.useForm();

  // Queries
  const { data: warehouse, isLoading: warehouseLoading } = useWarehouse(warehouseId);
  const { data: zones, isLoading: zonesLoading } = useZones(warehouseId);
  const binQueryParams: BinQueryParams = {
    warehouseZoneId: selectedZoneFilter,
    type: selectedTypeFilter,
  };
  const { data: bins, isLoading: binsLoading } = useBins(warehouseId, binQueryParams);

  // Mutations
  const createZoneMutation = useCreateZone(warehouseId);
  const updateZoneMutation = useUpdateZone(warehouseId);
  const deleteZoneMutation = useDeleteZone(warehouseId);
  const createBinMutation = useCreateBin(warehouseId);
  const updateBinMutation = useUpdateBin(warehouseId);
  const deleteBinMutation = useDeleteBin(warehouseId);

  // Handlers
  const handleBinClick = (bin: Bin) => {
    setSelectedBin(bin);
    setDrawerOpen(true);
  };

  const handleAddZone = () => {
    setEditingZone(null);
    zoneForm.resetFields();
    setZoneModalOpen(true);
  };

  const handleEditZone = (zone: WarehouseZone) => {
    setEditingZone(zone);
    zoneForm.setFieldsValue({
      name: zone.name,
      description: zone.description,
    });
    setZoneModalOpen(true);
  };

  const handleZoneSubmit = async (values: { name: string; description?: string }) => {
    if (editingZone) {
      await updateZoneMutation.mutateAsync({
        zoneId: editingZone.id,
        data: values,
      });
    } else {
      await createZoneMutation.mutateAsync(values);
    }
    setZoneModalOpen(false);
    zoneForm.resetFields();
  };

  const handleDeleteZone = async (zoneId: string) => {
    await deleteZoneMutation.mutateAsync(zoneId);
  };

  const handleAddBin = (zoneId?: string) => {
    setEditingBin(null);
    binForm.resetFields();
    if (zoneId) {
      binForm.setFieldsValue({ warehouseZoneId: zoneId });
    }
    setBinModalOpen(true);
  };

  const handleEditBin = (bin: Bin, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingBin(bin);
    binForm.setFieldsValue({
      code: bin.code,
      name: bin.name,
      type: bin.type,
      maxCapacity: bin.maxCapacity,
      warehouseZoneId: bin.warehouseZoneId,
      isActive: bin.isActive,
    });
    setBinModalOpen(true);
  };

  const handleBinSubmit = async (values: {
    code: string;
    name?: string;
    type?: BinType;
    maxCapacity?: number;
    warehouseZoneId?: string;
    isActive?: boolean;
  }) => {
    if (editingBin) {
      await updateBinMutation.mutateAsync({
        binId: editingBin.id,
        data: values,
      });
    } else {
      await createBinMutation.mutateAsync(values);
    }
    setBinModalOpen(false);
    binForm.resetFields();
  };

  const handleDeleteBin = async (binId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await deleteBinMutation.mutateAsync(binId);
  };

  const getBinActionMenu = (bin: Bin): MenuProps['items'] => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit Bin',
      onClick: ({ domEvent }) => handleEditBin(bin, domEvent as unknown as React.MouseEvent),
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete Bin',
      danger: true,
      disabled: (bin.itemCount ?? 0) > 0,
      onClick: ({ domEvent }) => handleDeleteBin(bin.id, domEvent as unknown as React.MouseEvent),
    },
  ];

  const zoneOptions = (zones || []).map((z) => ({
    value: z.id,
    label: z.name,
  }));

  if (warehouseLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Breadcrumb
          items={[
            { title: <a onClick={() => router.push('/inventory/warehouses')}>Warehouses</a> },
            { title: warehouse?.name || 'Warehouse' },
            { title: 'Bins & Locations' },
          ]}
          style={{ marginBottom: 12 }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push('/inventory/warehouses')}
            />
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {warehouse?.name} - Bins & Locations
              </Title>
              <Text type="secondary">
                Manage zones and bin locations within this warehouse
              </Text>
            </div>
          </Space>
          <Space>
            <Button onClick={handleAddZone} icon={<PlusOutlined />}>
              Add Zone
            </Button>
            <Button type="primary" onClick={() => handleAddBin()} icon={<PlusOutlined />}>
              Add Bin
            </Button>
          </Space>
        </div>
      </div>

      <Row gutter={24}>
        {/* Left Panel - Zones */}
        <Col xs={24} md={7} lg={6}>
          <Card
            title={
              <Space>
                <AppstoreOutlined />
                <span>Zones</span>
              </Space>
            }
            size="small"
            style={{ marginBottom: 16 }}
          >
            {zonesLoading ? (
              <Spin size="small" />
            ) : zones && zones.length > 0 ? (
              <div>
                {/* All bins option */}
                <div
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderRadius: 6,
                    marginBottom: 4,
                    background: !selectedZoneFilter ? '#e6f4ff' : 'transparent',
                  }}
                  onClick={() => setSelectedZoneFilter(undefined)}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text strong={!selectedZoneFilter}>All Zones</Text>
                    <Tag>{bins?.length ?? 0}</Tag>
                  </div>
                </div>

                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderRadius: 6,
                      marginBottom: 4,
                      background:
                        selectedZoneFilter === zone.id ? '#e6f4ff' : 'transparent',
                    }}
                    onClick={() =>
                      setSelectedZoneFilter(
                        selectedZoneFilter === zone.id ? undefined : zone.id,
                      )
                    }
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          strong={selectedZoneFilter === zone.id}
                          ellipsis
                          style={{ display: 'block' }}
                        >
                          {zone.name}
                        </Text>
                        {zone.description && (
                          <Text
                            type="secondary"
                            style={{ fontSize: 11, display: 'block' }}
                            ellipsis
                          >
                            {zone.description}
                          </Text>
                        )}
                      </div>
                      <Space size={4}>
                        <Tag style={{ margin: 0 }}>{zone._count?.bins ?? 0}</Tag>
                        <Dropdown
                          menu={{
                            items: [
                              {
                                key: 'edit',
                                icon: <EditOutlined />,
                                label: 'Edit',
                                onClick: ({ domEvent }) => {
                                  domEvent.stopPropagation();
                                  handleEditZone(zone);
                                },
                              },
                              {
                                key: 'addBin',
                                icon: <PlusOutlined />,
                                label: 'Add Bin',
                                onClick: ({ domEvent }) => {
                                  domEvent.stopPropagation();
                                  handleAddBin(zone.id);
                                },
                              },
                              { type: 'divider' },
                              {
                                key: 'delete',
                                icon: <DeleteOutlined />,
                                label: 'Delete',
                                danger: true,
                                disabled: (zone._count?.bins ?? 0) > 0,
                                onClick: ({ domEvent }) => {
                                  domEvent.stopPropagation();
                                  handleDeleteZone(zone.id);
                                },
                              },
                            ],
                          }}
                          trigger={['click']}
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<MoreOutlined />}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Dropdown>
                      </Space>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                description="No zones yet"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button size="small" onClick={handleAddZone}>
                  Create Zone
                </Button>
              </Empty>
            )}
          </Card>

          {/* Type Filter */}
          <Card
            title={
              <Space>
                <FilterOutlined />
                <span>Filter by Type</span>
              </Space>
            }
            size="small"
          >
            <div>
              <div
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  borderRadius: 6,
                  marginBottom: 2,
                  background: !selectedTypeFilter ? '#e6f4ff' : 'transparent',
                }}
                onClick={() => setSelectedTypeFilter(undefined)}
              >
                <Text strong={!selectedTypeFilter} style={{ fontSize: 13 }}>
                  All Types
                </Text>
              </div>
              {BIN_TYPE_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  style={{
                    padding: '6px 12px',
                    cursor: 'pointer',
                    borderRadius: 6,
                    marginBottom: 2,
                    background:
                      selectedTypeFilter === opt.value ? '#e6f4ff' : 'transparent',
                  }}
                  onClick={() =>
                    setSelectedTypeFilter(
                      selectedTypeFilter === opt.value ? undefined : opt.value,
                    )
                  }
                >
                  <Text
                    strong={selectedTypeFilter === opt.value}
                    style={{ fontSize: 13 }}
                  >
                    {opt.label}
                  </Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* Right Panel - Bins Grid */}
        <Col xs={24} md={17} lg={18}>
          <Card
            title={
              <Space>
                <span>
                  Bins{' '}
                  {bins && (
                    <Text type="secondary" style={{ fontWeight: 'normal' }}>
                      ({bins.length})
                    </Text>
                  )}
                </span>
              </Space>
            }
            size="small"
          >
            {binsLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
              </div>
            ) : bins && bins.length > 0 ? (
              <Row gutter={[12, 12]}>
                {bins.map((bin) => (
                  <Col key={bin.id} xs={24} sm={12} md={12} lg={8} xl={6}>
                    <div style={{ position: 'relative' }}>
                      <BinCard
                        bin={bin}
                        onClick={handleBinClick}
                        selected={selectedBin?.id === bin.id}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          zIndex: 1,
                        }}
                      >
                        <Dropdown
                          menu={{ items: getBinActionMenu(bin) }}
                          trigger={['click']}
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<MoreOutlined />}
                            onClick={(e) => e.stopPropagation()}
                            style={{ background: 'rgba(255,255,255,0.8)' }}
                          />
                        </Dropdown>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            ) : (
              <Empty description="No bins found">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddBin()}>
                  Create First Bin
                </Button>
              </Empty>
            )}
          </Card>
        </Col>
      </Row>

      {/* Bin Stock Drawer */}
      <BinStockDrawer
        bin={selectedBin}
        warehouseId={warehouseId}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedBin(null);
        }}
      />

      {/* Zone Modal */}
      <Modal
        title={editingZone ? 'Edit Zone' : 'Add Zone'}
        open={zoneModalOpen}
        onCancel={() => {
          setZoneModalOpen(false);
          zoneForm.resetFields();
        }}
        onOk={() => zoneForm.submit()}
        confirmLoading={
          createZoneMutation.isPending || updateZoneMutation.isPending
        }
      >
        <Form form={zoneForm} layout="vertical" onFinish={handleZoneSubmit}>
          <Form.Item
            name="name"
            label="Zone Name"
            rules={[{ required: true, message: 'Please enter zone name' }]}
          >
            <Input placeholder="e.g., Zone A, Receiving Dock" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea
              rows={3}
              placeholder="Optional description for this zone"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Bin Modal */}
      <Modal
        title={editingBin ? 'Edit Bin' : 'Add Bin'}
        open={binModalOpen}
        onCancel={() => {
          setBinModalOpen(false);
          binForm.resetFields();
        }}
        onOk={() => binForm.submit()}
        confirmLoading={
          createBinMutation.isPending || updateBinMutation.isPending
        }
      >
        <Form form={binForm} layout="vertical" onFinish={handleBinSubmit}>
          <Form.Item
            name="code"
            label="Bin Code"
            rules={[{ required: true, message: 'Please enter bin code' }]}
          >
            <Input placeholder="e.g., A-01-01" />
          </Form.Item>
          <Form.Item name="name" label="Bin Name">
            <Input placeholder="e.g., Aisle A, Rack 1, Shelf 1" />
          </Form.Item>
          <Form.Item name="type" label="Type" initialValue={BinType.STORAGE}>
            <Select options={BIN_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="maxCapacity" label="Max Capacity (units)">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              placeholder="Leave empty for unlimited"
            />
          </Form.Item>
          <Form.Item name="warehouseZoneId" label="Zone">
            <Select
              allowClear
              placeholder="Assign to zone (optional)"
              options={zoneOptions}
            />
          </Form.Item>
          {editingBin && (
            <Form.Item name="isActive" label="Active">
              <Select
                options={[
                  { value: true, label: 'Active' },
                  { value: false, label: 'Inactive' },
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
