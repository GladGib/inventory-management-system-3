import { Card, Row, Col, Statistic, Skeleton, Typography } from 'antd';
import { Contact } from '@/lib/contacts';

const { Text } = Typography;

interface BalanceSummaryCardProps {
  contact: Contact | undefined;
  loading?: boolean;
  balanceData?: {
    totalReceivable: number;
    totalReceived: number;
    receivableBalance: number;
    totalPayable: number;
    totalPaid: number;
    payableBalance: number;
    outstandingBalance: number;
  };
  balanceLoading?: boolean;
}

/**
 * BalanceSummaryCard - Displays receivable/payable balance summary
 *
 * Shows total outstanding balance and aging buckets
 * - Current (0-30 days)
 * - 1-30 days
 * - 31-60 days
 * - 61-90 days
 * - 90+ days overdue
 *
 * @example
 * <BalanceSummaryCard
 *   contact={contact}
 *   loading={isLoading}
 *   balanceData={balanceData}
 *   balanceLoading={isBalanceLoading}
 * />
 */
export function BalanceSummaryCard({
  contact,
  loading,
  balanceData,
  balanceLoading,
}: BalanceSummaryCardProps) {
  if (loading || !contact) {
    return (
      <Card title="Balance Summary" loading>
        <Skeleton active />
      </Card>
    );
  }

  const isCustomer = contact.type === 'CUSTOMER' || contact.type === 'BOTH';
  const isVendor = contact.type === 'VENDOR' || contact.type === 'BOTH';

  const formatCurrency = (amount: number) => {
    return `RM ${Number(amount || 0).toLocaleString('en-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // For now, show simple summary. Aging buckets would require API support
  return (
    <Card title="Balance Summary" loading={balanceLoading}>
      <Row gutter={[24, 24]}>
        {isCustomer && (
          <>
            <Col xs={24} sm={12} lg={8}>
              <Statistic
                title="Total Receivable"
                value={formatCurrency(balanceData?.totalReceivable || 0)}
                valueStyle={{ fontSize: 20 }}
              />
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Statistic
                title="Total Received"
                value={formatCurrency(balanceData?.totalReceived || 0)}
                valueStyle={{ fontSize: 20, color: '#52c41a' }}
              />
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Statistic
                title="Receivable Balance"
                value={formatCurrency(
                  balanceData?.receivableBalance || contact.outstandingBalance || 0
                )}
                valueStyle={{
                  fontSize: 20,
                  fontWeight: 600,
                  color:
                    (balanceData?.receivableBalance || contact.outstandingBalance || 0) > 0
                      ? '#ff4d4f'
                      : undefined,
                }}
              />
            </Col>
          </>
        )}

        {isVendor && (
          <>
            <Col xs={24} sm={12} lg={8}>
              <Statistic
                title="Total Payable"
                value={formatCurrency(balanceData?.totalPayable || 0)}
                valueStyle={{ fontSize: 20 }}
              />
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Statistic
                title="Total Paid"
                value={formatCurrency(balanceData?.totalPaid || 0)}
                valueStyle={{ fontSize: 20, color: '#52c41a' }}
              />
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Statistic
                title="Payable Balance"
                value={formatCurrency(balanceData?.payableBalance || 0)}
                valueStyle={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: (balanceData?.payableBalance || 0) > 0 ? '#ff4d4f' : undefined,
                }}
              />
            </Col>
          </>
        )}

        {contact.paymentTerm && (
          <Col xs={24}>
            <Text type="secondary">
              Payment Terms: {contact.paymentTerm.name} ({contact.paymentTerm.days} days)
            </Text>
          </Col>
        )}
      </Row>

      {/* Aging buckets - would require dedicated API endpoint */}
      {/*
      <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #f0f0f0' }}>
        <Text strong style={{ display: 'block', marginBottom: 16 }}>
          Aging Summary
        </Text>
        <Row gutter={[16, 16]}>
          <Col span={24} sm={12} md={4}>
            <Statistic title="Current" value={formatCurrency(0)} />
          </Col>
          <Col span={24} sm={12} md={4}>
            <Statistic title="1-30 Days" value={formatCurrency(0)} />
          </Col>
          <Col span={24} sm={12} md={4}>
            <Statistic title="31-60 Days" value={formatCurrency(0)} />
          </Col>
          <Col span={24} sm={12} md={4}>
            <Statistic title="61-90 Days" value={formatCurrency(0)} />
          </Col>
          <Col span={24} sm={12} md={4}>
            <Statistic title="90+ Days" value={formatCurrency(0)} valueStyle={{ color: '#ff4d4f' }} />
          </Col>
        </Row>
      </div>
      */}
    </Card>
  );
}
