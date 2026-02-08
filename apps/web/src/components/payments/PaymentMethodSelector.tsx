'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Space,
  Select,
  Tag,
  Spin,
  Alert,
} from 'antd';
import {
  BankOutlined,
  QrcodeOutlined,
  WalletOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';

const { Title, Text } = Typography;

/** Supported payment gateway types */
export type PaymentGateway = 'FPX' | 'DUITNOW' | 'GRABPAY' | 'TNG';

/** Bank information for FPX payments */
export interface BankOption {
  code: string;
  name: string;
  active: boolean;
}

/** Props for the PaymentMethodSelector component */
interface PaymentMethodSelectorProps {
  /** Currently selected gateway */
  selectedGateway?: PaymentGateway;
  /** Callback when a gateway is selected */
  onSelectGateway: (gateway: PaymentGateway) => void;
  /** Callback when pay button is clicked */
  onPay: (gateway: PaymentGateway, bankCode?: string) => void;
  /** Amount to display (in MYR) */
  amount: number;
  /** Whether a payment is currently being processed */
  isLoading?: boolean;
  /** Error message to display */
  error?: string;
  /** Available banks for FPX (loaded from API) */
  banks?: BankOption[];
  /** Whether banks are being loaded */
  isBanksLoading?: boolean;
  /** Whether the component is disabled */
  disabled?: boolean;
}

/** Configuration for each payment method card */
interface PaymentMethodConfig {
  key: PaymentGateway;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  requiresBankSelection: boolean;
}

const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    key: 'FPX',
    name: 'FPX',
    description: 'Online banking via Malaysian banks',
    icon: <BankOutlined style={{ fontSize: 28 }} />,
    color: '#1a4b8c',
    bgColor: '#f0f5ff',
    borderColor: '#1a4b8c',
    requiresBankSelection: true,
  },
  {
    key: 'DUITNOW',
    name: 'DuitNow',
    description: 'Scan QR or pay via DuitNow',
    icon: <QrcodeOutlined style={{ fontSize: 28 }} />,
    color: '#e30613',
    bgColor: '#fff1f0',
    borderColor: '#e30613',
    requiresBankSelection: false,
  },
  {
    key: 'GRABPAY',
    name: 'GrabPay',
    description: 'Pay using your Grab eWallet',
    icon: <WalletOutlined style={{ fontSize: 28 }} />,
    color: '#00b14f',
    bgColor: '#f6ffed',
    borderColor: '#00b14f',
    requiresBankSelection: false,
  },
  {
    key: 'TNG',
    name: "Touch 'n Go",
    description: 'Pay with TNG eWallet',
    icon: <WalletOutlined style={{ fontSize: 28 }} />,
    color: '#005abb',
    bgColor: '#e6f4ff',
    borderColor: '#005abb',
    requiresBankSelection: false,
  },
];

/**
 * PaymentMethodSelector Component
 *
 * Displays available Malaysian payment methods (FPX, DuitNow, GrabPay, TNG)
 * as selectable cards. When FPX is selected, shows a bank selector dropdown.
 * For other methods, shows a direct "Pay with X" button.
 */
export function PaymentMethodSelector({
  selectedGateway,
  onSelectGateway,
  onPay,
  amount,
  isLoading = false,
  error,
  banks = [],
  isBanksLoading = false,
  disabled = false,
}: PaymentMethodSelectorProps) {
  const [selectedBank, setSelectedBank] = useState<string | undefined>();

  const selectedMethod = useMemo(
    () => PAYMENT_METHODS.find((m) => m.key === selectedGateway),
    [selectedGateway],
  );

  const activeBanks = useMemo(
    () => banks.filter((b) => b.active),
    [banks],
  );

  const handlePay = () => {
    if (!selectedGateway) return;

    if (selectedGateway === 'FPX' && !selectedBank) {
      return; // Bank selection required for FPX
    }

    onPay(selectedGateway, selectedBank);
  };

  const canPay =
    selectedGateway &&
    !isLoading &&
    !disabled &&
    (selectedGateway !== 'FPX' || !!selectedBank);

  return (
    <div>
      <Title level={5} style={{ marginBottom: 16 }}>
        Select Payment Method
      </Title>

      {error && (
        <Alert
          message="Payment Error"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[12, 12]}>
        {PAYMENT_METHODS.map((method) => {
          const isSelected = selectedGateway === method.key;

          return (
            <Col xs={12} sm={12} md={6} key={method.key}>
              <Card
                hoverable={!disabled}
                onClick={() => !disabled && onSelectGateway(method.key)}
                style={{
                  borderColor: isSelected ? method.borderColor : '#d9d9d9',
                  borderWidth: isSelected ? 2 : 1,
                  backgroundColor: isSelected ? method.bgColor : '#fff',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.6 : 1,
                  height: '100%',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
                bodyStyle={{
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                {isSelected && (
                  <CheckCircleFilled
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      color: method.color,
                      fontSize: 18,
                    }}
                  />
                )}

                <Space direction="vertical" size={4} align="center">
                  <div style={{ color: method.color }}>{method.icon}</div>
                  <Text
                    strong
                    style={{
                      color: isSelected ? method.color : undefined,
                      fontSize: 14,
                    }}
                  >
                    {method.name}
                  </Text>
                  <Text
                    type="secondary"
                    style={{ fontSize: 11, lineHeight: 1.3 }}
                  >
                    {method.description}
                  </Text>
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Bank selector for FPX */}
      {selectedGateway === 'FPX' && (
        <div style={{ marginTop: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Select Your Bank
          </Text>
          <Select
            showSearch
            placeholder="Search for your bank..."
            value={selectedBank}
            onChange={setSelectedBank}
            loading={isBanksLoading}
            disabled={disabled || isBanksLoading}
            style={{ width: '100%' }}
            filterOption={(input, option) =>
              (option?.label as string)
                ?.toLowerCase()
                .includes(input.toLowerCase()) ?? false
            }
            options={activeBanks.map((bank) => ({
              value: bank.code,
              label: bank.name,
            }))}
            notFoundContent={
              isBanksLoading ? (
                <Spin size="small" />
              ) : (
                'No banks available'
              )
            }
          />
        </div>
      )}

      {/* Pay button */}
      {selectedGateway && (
        <div style={{ marginTop: 20 }}>
          <Button
            type="primary"
            size="large"
            block
            loading={isLoading}
            disabled={!canPay}
            onClick={handlePay}
            style={{
              backgroundColor: canPay
                ? selectedMethod?.color
                : undefined,
              borderColor: canPay
                ? selectedMethod?.color
                : undefined,
              height: 48,
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {isLoading
              ? 'Processing...'
              : `Pay RM ${amount.toFixed(2)} with ${selectedMethod?.name}`}
          </Button>

          <div style={{ marginTop: 8, textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              You will be redirected to {selectedMethod?.name} to complete
              your payment securely.
            </Text>
          </div>
        </div>
      )}
    </div>
  );
}
