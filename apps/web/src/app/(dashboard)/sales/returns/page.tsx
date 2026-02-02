'use client';

import { Card, Typography, Result, Button } from 'antd';
import { RollbackOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title } = Typography;

export default function SalesReturnsPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Sales Returns
      </Title>

      <Card>
        <Result
          icon={<RollbackOutlined style={{ color: '#1890ff' }} />}
          title="Sales Returns"
          subTitle="Process customer returns and issue credit notes. Manage returned inventory and refunds."
          extra={
            <Link href="/sales/orders">
              <Button type="primary">Back to Sales Orders</Button>
            </Link>
          }
        />
      </Card>
    </div>
  );
}
