'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Dropdown,
  Modal,
  Input,
  Form,
  Empty,
  Row,
  Col,
  Tag,
  type MenuProps,
  type TableColumnsType,
} from 'antd';
import {
  PlusOutlined,
  ArrowLeftOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  CarOutlined,
} from '@ant-design/icons';
import {
  useVehicleMakes,
  useVehicleModels,
  useCreateMake,
  useUpdateMake,
  useDeleteMake,
  useCreateModel,
  useUpdateModel,
  useDeleteModel,
} from '@/hooks/use-vehicles';
import { VehicleMake, VehicleModel } from '@/lib/vehicles';

const { Title, Text } = Typography;
const { confirm } = Modal;

export default function VehiclesSettingsPage() {
  const [selectedMakeId, setSelectedMakeId] = useState<string>('');
  const [makeFormOpen, setMakeFormOpen] = useState(false);
  const [modelFormOpen, setModelFormOpen] = useState(false);
  const [editingMake, setEditingMake] = useState<VehicleMake | null>(null);
  const [editingModel, setEditingModel] = useState<VehicleModel | null>(null);

  const [makeForm] = Form.useForm();
  const [modelForm] = Form.useForm();

  const { data: makes, isLoading: makesLoading } = useVehicleMakes();
  const { data: models, isLoading: modelsLoading } = useVehicleModels(selectedMakeId);

  const createMake = useCreateMake();
  const updateMake = useUpdateMake();
  const deleteMake = useDeleteMake();
  const createModel = useCreateModel();
  const updateModel = useUpdateModel();
  const deleteModel = useDeleteModel();

  const selectedMake = makes?.find((m) => m.id === selectedMakeId);

  // ========== Make CRUD ==========

  const handleCreateMake = () => {
    setEditingMake(null);
    makeForm.resetFields();
    setMakeFormOpen(true);
  };

  const handleEditMake = (record: VehicleMake) => {
    setEditingMake(record);
    makeForm.setFieldsValue({ name: record.name, country: record.country });
    setMakeFormOpen(true);
  };

  const handleDeleteMake = (record: VehicleMake) => {
    confirm({
      title: 'Delete Vehicle Make',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>
            Are you sure you want to delete <strong>{record.name}</strong>?
          </p>
          {record.modelCount && record.modelCount > 0 && (
            <p style={{ color: '#ff4d4f' }}>
              This will also delete {record.modelCount} model(s) and all related compatibility records.
            </p>
          )}
        </div>
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        if (selectedMakeId === record.id) {
          setSelectedMakeId('');
        }
        deleteMake.mutate(record.id);
      },
    });
  };

  const handleMakeFormSubmit = async (values: { name: string; country?: string }) => {
    try {
      if (editingMake) {
        await updateMake.mutateAsync({
          id: editingMake.id,
          data: { name: values.name, country: values.country },
        });
      } else {
        await createMake.mutateAsync({ name: values.name, country: values.country });
      }
      setMakeFormOpen(false);
      makeForm.resetFields();
    } catch {
      // Error handled by mutation
    }
  };

  // ========== Model CRUD ==========

  const handleCreateModel = () => {
    setEditingModel(null);
    modelForm.resetFields();
    setModelFormOpen(true);
  };

  const handleEditModel = (record: VehicleModel) => {
    setEditingModel(record);
    modelForm.setFieldsValue({ name: record.name });
    setModelFormOpen(true);
  };

  const handleDeleteModel = (record: VehicleModel) => {
    confirm({
      title: 'Delete Vehicle Model',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${record.name}"? This will also remove all related compatibility records.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deleteModel.mutate(record.id),
    });
  };

  const handleModelFormSubmit = async (values: { name: string }) => {
    try {
      if (editingModel) {
        await updateModel.mutateAsync({
          id: editingModel.id,
          data: { name: values.name },
        });
      } else {
        await createModel.mutateAsync({
          makeId: selectedMakeId,
          data: { name: values.name },
        });
      }
      setModelFormOpen(false);
      modelForm.resetFields();
    } catch {
      // Error handled by mutation
    }
  };

  // ========== Table Columns ==========

  const getMakeActionMenuItems = (record: VehicleMake): MenuProps['items'] => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
      onClick: () => handleEditMake(record),
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: () => handleDeleteMake(record),
    },
  ];

  const getModelActionMenuItems = (record: VehicleModel): MenuProps['items'] => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
      onClick: () => handleEditModel(record),
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: () => handleDeleteModel(record),
    },
  ];

  const makeColumns: TableColumnsType<VehicleMake> = [
    {
      title: 'Make',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: VehicleMake) => (
        <a
          onClick={() => setSelectedMakeId(record.id)}
          style={{
            fontWeight: selectedMakeId === record.id ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          {name}
        </a>
      ),
    },
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country',
      width: 100,
      render: (country: string | null) => country || '-',
    },
    {
      title: 'Models',
      dataIndex: 'modelCount',
      key: 'modelCount',
      width: 70,
      align: 'center',
      render: (count: number) => <Tag>{count || 0}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      align: 'center',
      render: (_: unknown, record: VehicleMake) => (
        <Dropdown menu={{ items: getMakeActionMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const modelColumns: TableColumnsType<VehicleModel> = [
    {
      title: 'Model',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Items',
      dataIndex: 'compatibilityCount',
      key: 'compatibilityCount',
      width: 70,
      align: 'center',
      render: (count: number) => <Tag>{count || 0}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      align: 'center',
      render: (_: unknown, record: VehicleModel) => (
        <Dropdown menu={{ items: getModelActionMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/settings">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Settings
            </Button>
          </Link>
        </Space>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              <CarOutlined style={{ marginRight: 8 }} />
              Vehicle Makes & Models
            </Title>
            <Text type="secondary">
              Manage vehicle makes and models for parts compatibility
            </Text>
          </div>
        </div>
      </div>

      <Row gutter={16}>
        {/* Makes Column */}
        <Col span={12}>
          <Card
            title="Vehicle Makes"
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateMake}
                size="small"
              >
                Add Make
              </Button>
            }
          >
            {!makesLoading && (!makes || makes.length === 0) ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No vehicle makes configured"
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateMake}
                >
                  Add Vehicle Make
                </Button>
              </Empty>
            ) : (
              <Table
                columns={makeColumns}
                dataSource={makes || []}
                rowKey="id"
                loading={makesLoading}
                pagination={false}
                size="small"
                rowClassName={(record) =>
                  record.id === selectedMakeId ? 'ant-table-row-selected' : ''
                }
                onRow={(record) => ({
                  onClick: () => setSelectedMakeId(record.id),
                  style: { cursor: 'pointer' },
                })}
              />
            )}
          </Card>
        </Col>

        {/* Models Column */}
        <Col span={12}>
          <Card
            title={
              selectedMake
                ? `Models for ${selectedMake.name}`
                : 'Vehicle Models'
            }
            extra={
              selectedMakeId && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateModel}
                  size="small"
                >
                  Add Model
                </Button>
              )
            }
          >
            {!selectedMakeId ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Select a make to view its models"
              />
            ) : !modelsLoading && (!models || models.length === 0) ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={`No models for ${selectedMake?.name}`}
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateModel}
                >
                  Add Model
                </Button>
              </Empty>
            ) : (
              <Table
                columns={modelColumns}
                dataSource={models || []}
                rowKey="id"
                loading={modelsLoading}
                pagination={false}
                size="small"
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Make Form Modal */}
      <Modal
        title={editingMake ? 'Edit Vehicle Make' : 'Add Vehicle Make'}
        open={makeFormOpen}
        onCancel={() => {
          setMakeFormOpen(false);
          makeForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={makeForm}
          layout="vertical"
          onFinish={handleMakeFormSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Make Name"
            rules={[{ required: true, message: 'Please enter the make name' }]}
          >
            <Input placeholder="e.g. Toyota, Honda, Perodua" />
          </Form.Item>
          <Form.Item
            name="country"
            label="Country of Origin"
          >
            <Input placeholder="e.g. Japan, Malaysia, Germany" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setMakeFormOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMake.isPending || updateMake.isPending}
              >
                {editingMake ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Model Form Modal */}
      <Modal
        title={editingModel ? 'Edit Vehicle Model' : 'Add Vehicle Model'}
        open={modelFormOpen}
        onCancel={() => {
          setModelFormOpen(false);
          modelForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={modelForm}
          layout="vertical"
          onFinish={handleModelFormSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Model Name"
            rules={[{ required: true, message: 'Please enter the model name' }]}
          >
            <Input placeholder={`e.g. Vios, City, Myvi`} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModelFormOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createModel.isPending || updateModel.isPending}
              >
                {editingModel ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
