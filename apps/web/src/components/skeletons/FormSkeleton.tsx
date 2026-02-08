import { Skeleton } from 'antd';

interface FormSkeletonProps {
  fields?: number;
}

/**
 * FormSkeleton - Mimics a form layout loading state
 * Used in create/edit form pages
 */
export function FormSkeleton({ fields = 6 }: FormSkeletonProps) {
  return (
    <div style={{ maxWidth: 800 }}>
      {/* Form Fields */}
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} style={{ marginBottom: 24 }}>
          {/* Label */}
          <Skeleton.Input active size="small" style={{ width: 120, height: 20, marginBottom: 8 }} />
          {/* Input Field */}
          <Skeleton.Input active style={{ width: '100%', height: 32 }} />
        </div>
      ))}

      {/* Action Buttons */}
      <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
        <Skeleton.Button active style={{ width: 100, height: 32 }} />
        <Skeleton.Button active style={{ width: 100, height: 32 }} />
      </div>
    </div>
  );
}
