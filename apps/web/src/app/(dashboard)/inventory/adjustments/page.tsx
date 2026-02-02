'use client';

import { Card, Typography, Result, Button } from 'antd';
import { ControlOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title } = Typography;

export default function InventoryAdjustmentsPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Inventory Adjustments
      </Title>

      <Card>
        <Result
          icon={<ControlOutlined style={{ color: '#1890ff' }} />}
          title="Inventory Adjustments"
          subTitle="Record stock adjustments for damaged goods, expired items, or manual corrections to inventory levels."
          extra={
            <Link href="/inventory">
              <Button type="primary">Back to Inventory</Button>
            </Link>
          }
        />
      </Card>
    </div>
  );
}
