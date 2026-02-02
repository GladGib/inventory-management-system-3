'use client';

import { Card, Typography, Result, Button } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title } = Typography;

export default function InventoryTransfersPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Inventory Transfers
      </Title>

      <Card>
        <Result
          icon={<SwapOutlined style={{ color: '#1890ff' }} />}
          title="Stock Transfers"
          subTitle="Transfer inventory between warehouses. Track the movement of goods across different locations."
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
