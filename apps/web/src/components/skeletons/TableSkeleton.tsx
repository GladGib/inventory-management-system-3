import { Skeleton } from 'antd';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

/**
 * TableSkeleton - Mimics a data table loading state
 * Used in list/index pages with tabular data
 */
export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <div style={{ padding: '16px 0' }}>
      {/* Search/Filter Bar */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Skeleton.Input active style={{ width: 300, height: 32 }} />
        <Skeleton.Input active style={{ width: 120, height: 32 }} />
        <Skeleton.Input active style={{ width: 120, height: 32 }} />
      </div>

      {/* Table Header */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: 8,
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton.Input
            key={i}
            active
            size="small"
            style={{ width: i === 0 ? 120 : 150, height: 20 }}
          />
        ))}
      </div>

      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'flex',
            gap: 12,
            padding: '16px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} style={{ flex: colIndex === 0 ? '0 0 120px' : '1' }}>
              <Skeleton.Input active size="small" style={{ width: '100%', height: 20 }} />
            </div>
          ))}
        </div>
      ))}

      {/* Pagination */}
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Skeleton.Button active size="small" style={{ width: 32 }} />
        <Skeleton.Button active size="small" style={{ width: 32 }} />
        <Skeleton.Button active size="small" style={{ width: 32 }} />
      </div>
    </div>
  );
}
