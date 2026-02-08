import { Skeleton, Card } from 'antd';

/**
 * ChartSkeleton - Mimics a chart/graph loading state
 * Used in dashboard charts and analytics pages
 */
export function ChartSkeleton() {
  return (
    <Card>
      <div style={{ padding: '8px 0' }}>
        {/* Chart Title */}
        <Skeleton.Input active style={{ width: 180, height: 24, marginBottom: 24 }} />

        {/* Chart Area - Rectangular placeholder */}
        <div
          style={{
            width: '100%',
            height: 300,
            backgroundColor: '#f5f5f5',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Skeleton active paragraph={{ rows: 6 }} style={{ width: '90%' }} />
        </div>

        {/* Legend/Footer */}
        <div style={{ marginTop: 16, display: 'flex', gap: 24, justifyContent: 'center' }}>
          <Skeleton.Input active size="small" style={{ width: 80, height: 16 }} />
          <Skeleton.Input active size="small" style={{ width: 80, height: 16 }} />
          <Skeleton.Input active size="small" style={{ width: 80, height: 16 }} />
        </div>
      </div>
    </Card>
  );
}
