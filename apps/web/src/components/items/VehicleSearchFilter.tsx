'use client';

import { useState, useCallback } from 'react';
import { Select, InputNumber, Space, Button, Typography } from 'antd';
import { CarOutlined, CloseOutlined } from '@ant-design/icons';
import { useVehicleMakes, useVehicleModels } from '@/hooks/use-vehicles';

const { Text } = Typography;

interface VehicleSearchFilterProps {
  onFilterChange: (filters: {
    makeId?: string;
    modelId?: string;
    year?: number;
  }) => void;
}

export function VehicleSearchFilter({ onFilterChange }: VehicleSearchFilterProps) {
  const [makeId, setMakeId] = useState<string | undefined>();
  const [modelId, setModelId] = useState<string | undefined>();
  const [year, setYear] = useState<number | undefined>();

  const { data: makes, isLoading: makesLoading } = useVehicleMakes();
  const { data: models, isLoading: modelsLoading } = useVehicleModels(makeId || '');

  const currentYear = new Date().getFullYear();

  const handleMakeChange = useCallback(
    (value: string | undefined) => {
      setMakeId(value);
      setModelId(undefined);
      onFilterChange({ makeId: value, modelId: undefined, year });
    },
    [year, onFilterChange],
  );

  const handleModelChange = useCallback(
    (value: string | undefined) => {
      setModelId(value);
      onFilterChange({ makeId, modelId: value, year });
    },
    [makeId, year, onFilterChange],
  );

  const handleYearChange = useCallback(
    (value: number | null) => {
      const yearVal = value || undefined;
      setYear(yearVal);
      onFilterChange({ makeId, modelId, year: yearVal });
    },
    [makeId, modelId, onFilterChange],
  );

  const handleClear = useCallback(() => {
    setMakeId(undefined);
    setModelId(undefined);
    setYear(undefined);
    onFilterChange({});
  }, [onFilterChange]);

  const hasFilters = makeId || modelId || year;

  return (
    <Space wrap align="center">
      <CarOutlined style={{ color: '#1890ff' }} />
      <Text type="secondary" style={{ fontSize: 12 }}>Vehicle:</Text>
      <Select
        placeholder="Make"
        style={{ width: 150 }}
        allowClear
        showSearch
        optionFilterProp="label"
        loading={makesLoading}
        value={makeId}
        onChange={handleMakeChange}
        options={
          makes?.map((m) => ({
            value: m.id,
            label: m.name,
          })) || []
        }
      />
      <Select
        placeholder="Model"
        style={{ width: 150 }}
        allowClear
        showSearch
        optionFilterProp="label"
        loading={modelsLoading}
        disabled={!makeId}
        value={modelId}
        onChange={handleModelChange}
        options={
          models?.map((m) => ({
            value: m.id,
            label: m.name,
          })) || []
        }
      />
      <InputNumber
        placeholder="Year"
        style={{ width: 100 }}
        min={1900}
        max={currentYear + 5}
        value={year}
        onChange={handleYearChange}
      />
      {hasFilters && (
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={handleClear}
        >
          Clear
        </Button>
      )}
    </Space>
  );
}
