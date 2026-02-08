import { Skeleton, Card, Row, Col } from 'antd';

interface CardSkeletonProps {
  count?: number;
}

/**
 * CardSkeleton - Mimics stat/KPI cards loading state
 * Used in dashboard and report summary pages
 */
export function CardSkeleton({ count = 4 }: CardSkeletonProps) {
  return (
    <Row gutter={[24, 24]}>
      {Array.from({ length: count }).map((_, i) => (
        <Col key={i} xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ padding: '8px 0' }}>
              {/* Title */}
              <Skeleton.Input
                active
                size="small"
                style={{ width: 120, height: 20, marginBottom: 16 }}
              />
              {/* Value */}
              <Skeleton.Input active style={{ width: 140, height: 32 }} />
              {/* Subtitle/Trend */}
              <div style={{ marginTop: 12 }}>
                <Skeleton.Input active size="small" style={{ width: 80, height: 16 }} />
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
