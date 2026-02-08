'use client';

import { useState } from 'react';
import {
  Modal,
  Form,
  Select,
  InputNumber,
  Input,
  Button,
  Space,
  Divider,
  Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  useVehicleMakes,
  useVehicleModels,
  useAddCompatibility,
  useCreateMake,
  useCreateModel,
} from '@/hooks/use-vehicles';

const { Text } = Typography;

interface AddCompatibilityModalProps {
  open: boolean;
  itemId: string;
  onClose: () => void;
}

export function AddCompatibilityModal({
  open,
  itemId,
  onClose,
}: AddCompatibilityModalProps) {
  const [form] = Form.useForm();
  const [selectedMakeId, setSelectedMakeId] = useState<string>('');
  const [newMakeName, setNewMakeName] = useState('');
  const [newModelName, setNewModelName] = useState('');

  const { data: makes, isLoading: makesLoading } = useVehicleMakes();
  const { data: models, isLoading: modelsLoading } = useVehicleModels(selectedMakeId);
  const addCompatibility = useAddCompatibility();
  const createMake = useCreateMake();
  const createModel = useCreateModel();

  const handleMakeChange = (value: string) => {
    setSelectedMakeId(value);
    form.setFieldsValue({ vehicleModelId: undefined });
  };

  const handleAddNewMake = async () => {
    if (!newMakeName.trim()) return;
    try {
      const newMake = await createMake.mutateAsync({ name: newMakeName.trim() });
      setNewMakeName('');
      form.setFieldsValue({ vehicleMakeId: newMake.id });
      setSelectedMakeId(newMake.id);
    } catch {
      // Error handled by mutation
    }
  };

  const handleAddNewModel = async () => {
    if (!newModelName.trim() || !selectedMakeId) return;
    try {
      const newModel = await createModel.mutateAsync({
        makeId: selectedMakeId,
        data: { name: newModelName.trim() },
      });
      setNewModelName('');
      form.setFieldsValue({ vehicleModelId: newModel.id });
    } catch {
      // Error handled by mutation
    }
  };

  const handleSubmit = async (values: {
    vehicleMakeId: string;
    vehicleModelId?: string;
    yearFrom?: number;
    yearTo?: number;
    notes?: string;
  }) => {
    try {
      await addCompatibility.mutateAsync({
        itemId,
        data: {
          vehicleMakeId: values.vehicleMakeId,
          vehicleModelId: values.vehicleModelId || undefined,
          yearFrom: values.yearFrom || undefined,
          yearTo: values.yearTo || undefined,
          notes: values.notes || undefined,
        },
      });
      form.resetFields();
      setSelectedMakeId('');
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedMakeId('');
    setNewMakeName('');
    setNewModelName('');
    onClose();
  };

  const currentYear = new Date().getFullYear();

  return (
    <Modal
      title="Add Vehicle Compatibility"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={520}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="vehicleMakeId"
          label="Vehicle Make"
          rules={[{ required: true, message: 'Please select a vehicle make' }]}
        >
          <Select
            placeholder="Select vehicle make"
            loading={makesLoading}
            showSearch
            optionFilterProp="label"
            onChange={handleMakeChange}
            options={
              makes?.map((m) => ({
                value: m.id,
                label: m.name + (m.country ? ` (${m.country})` : ''),
              })) || []
            }
            dropdownRender={(menu) => (
              <>
                {menu}
                <Divider style={{ margin: '8px 0' }} />
                <Space style={{ padding: '0 8px 4px' }}>
                  <Input
                    placeholder="New make name"
                    value={newMakeName}
                    onChange={(e) => setNewMakeName(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    size="small"
                  />
                  <Button
                    type="text"
                    icon={<PlusOutlined />}
                    onClick={handleAddNewMake}
                    loading={createMake.isPending}
                    size="small"
                  >
                    Add
                  </Button>
                </Space>
              </>
            )}
          />
        </Form.Item>

        <Form.Item
          name="vehicleModelId"
          label="Vehicle Model"
          extra={<Text type="secondary">Optional - leave empty to match all models</Text>}
        >
          <Select
            placeholder={selectedMakeId ? 'Select vehicle model' : 'Select a make first'}
            loading={modelsLoading}
            disabled={!selectedMakeId}
            showSearch
            optionFilterProp="label"
            allowClear
            options={
              models?.map((m) => ({
                value: m.id,
                label: m.name,
              })) || []
            }
            dropdownRender={(menu) => (
              <>
                {menu}
                {selectedMakeId && (
                  <>
                    <Divider style={{ margin: '8px 0' }} />
                    <Space style={{ padding: '0 8px 4px' }}>
                      <Input
                        placeholder="New model name"
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        size="small"
                      />
                      <Button
                        type="text"
                        icon={<PlusOutlined />}
                        onClick={handleAddNewModel}
                        loading={createModel.isPending}
                        size="small"
                      >
                        Add
                      </Button>
                    </Space>
                  </>
                )}
              </>
            )}
          />
        </Form.Item>

        <Space size="large">
          <Form.Item
            name="yearFrom"
            label="Year From"
            extra={<Text type="secondary">Optional</Text>}
          >
            <InputNumber
              min={1900}
              max={currentYear + 5}
              placeholder="e.g. 2014"
              style={{ width: 140 }}
            />
          </Form.Item>

          <Form.Item
            name="yearTo"
            label="Year To"
            extra={<Text type="secondary">Optional</Text>}
          >
            <InputNumber
              min={1900}
              max={currentYear + 5}
              placeholder="e.g. 2023"
              style={{ width: 140 }}
            />
          </Form.Item>
        </Space>

        <Form.Item
          name="notes"
          label="Notes"
        >
          <Input.TextArea
            placeholder="Optional notes (e.g. front axle only, 1.5L engine variant)"
            rows={2}
            maxLength={500}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={addCompatibility.isPending}
            >
              Add Compatibility
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
