'use client';

import { Card, Typography, Result, Button } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title } = Typography;

export default function ItemGroupsPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Item Groups
      </Title>

      <Card>
        <Result
          icon={<AppstoreOutlined style={{ color: '#1890ff' }} />}
          title="Item Groups"
          subTitle="Create and manage item groups to organize products with similar attributes like size, color, or variant."
          extra={
            <Link href="/items">
              <Button type="primary">Back to Items</Button>
            </Link>
          }
        />
      </Card>
    </div>
  );
}
