import { Skeleton } from 'antd';

interface DetailPageSkeletonProps {
  tabs?: number;
}

/**
 * DetailPageSkeleton - Mimics a detail/view page loading state
 * Used in detail pages with header, tabs, and content
 */
export function DetailPageSkeleton({ tabs = 3 }: DetailPageSkeletonProps) {
  return (
    <div>
      {/* Breadcrumbs */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Skeleton.Input active size="small" style={{ width: 60, height: 20 }} />
        <span style={{ color: '#d9d9d9' }}>/</span>
        <Skeleton.Input active size="small" style={{ width: 80, height: 20 }} />
      </div>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Skeleton.Input active style={{ width: 200, height: 32 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Skeleton.Button active style={{ width: 80, height: 32 }} />
          <Skeleton.Button active style={{ width: 80, height: 32 }} />
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{ marginBottom: 24, display: 'flex', gap: 32, borderBottom: '1px solid #f0f0f0' }}
      >
        {Array.from({ length: tabs }).map((_, i) => (
          <Skeleton.Input
            key={i}
            active
            size="small"
            style={{ width: 80, height: 20, marginBottom: -1 }}
          />
        ))}
      </div>

      {/* Content Area */}
      <div style={{ marginTop: 24 }}>
        <Skeleton active paragraph={{ rows: 4 }} />
        <div style={{ marginTop: 24 }}>
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>
        <div style={{ marginTop: 24 }}>
          <Skeleton active paragraph={{ rows: 2 }} />
        </div>
      </div>
    </div>
  );
}
