'use client';

import { Drawer, Card, Tag, Button, Typography, Row, Col, Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getAllWidgetDefinitions, type WidgetDefinition } from './widget-registry';

const { Text, Title } = Typography;

const categoryLabels: Record<string, string> = {
  kpi: 'Key Metrics',
  chart: 'Charts',
  table: 'Tables',
  feed: 'Activity Feeds',
};

const categoryColors: Record<string, string> = {
  kpi: 'blue',
  chart: 'green',
  table: 'purple',
  feed: 'orange',
};

interface WidgetDrawerProps {
  open: boolean;
  onClose: () => void;
  visibleWidgetTypes: Set<string>;
  onAddWidget: (type: string) => void;
}

export function WidgetDrawer({
  open,
  onClose,
  visibleWidgetTypes,
  onAddWidget,
}: WidgetDrawerProps) {
  const allWidgets = getAllWidgetDefinitions();

  // Group by category
  const grouped = allWidgets.reduce(
    (acc, widget) => {
      const cat = widget.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(widget);
      return acc;
    },
    {} as Record<string, WidgetDefinition[]>
  );

  const availableWidgets = allWidgets.filter((w) => !visibleWidgetTypes.has(w.type));

  return (
    <Drawer title="Add Widgets" placement="right" width={400} open={open} onClose={onClose}>
      {availableWidgets.length === 0 ? (
        <Empty description="All widgets are already on your dashboard" style={{ marginTop: 60 }} />
      ) : (
        Object.entries(grouped).map(([category, widgets]) => {
          const availableInCategory = widgets.filter((w) => !visibleWidgetTypes.has(w.type));
          if (availableInCategory.length === 0) return null;

          return (
            <div key={category} style={{ marginBottom: 24 }}>
              <Title level={5} style={{ marginBottom: 12 }}>
                <Tag color={categoryColors[category]}>{categoryLabels[category]}</Tag>
              </Title>
              <Row gutter={[12, 12]}>
                {availableInCategory.map((widget) => (
                  <Col span={24} key={widget.type}>
                    <Card
                      size="small"
                      hoverable
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        onAddWidget(widget.type);
                        onClose();
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <Text strong>{widget.label}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {widget.description}
                          </Text>
                        </div>
                        <Button type="primary" ghost size="small" icon={<PlusOutlined />}>
                          Add
                        </Button>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          );
        })
      )}
    </Drawer>
  );
}
