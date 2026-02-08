'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Result, Spin, Typography, Button, Card, Space, Tag, Progress } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

/** Payment status values matching the backend OnlinePaymentStatus enum */
export type OnlinePaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'EXPIRED';

/** Payment status response from the API */
export interface PaymentStatusData {
  id: string;
  gateway: string;
  status: OnlinePaymentStatus;
  amount: number;
  currency: string;
  referenceNumber: string;
  gatewayRef?: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    total: number;
    balance: number;
    paymentStatus: string;
  };
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

/** Props for the PaymentStatus component */
interface PaymentStatusProps {
  /** Payment ID to poll */
  paymentId: string;
  /** Function to fetch payment status from the API */
  fetchStatus: (paymentId: string) => Promise<PaymentStatusData>;
  /** Callback when payment completes successfully */
  onSuccess?: (data: PaymentStatusData) => void;
  /** Callback when payment fails */
  onFailure?: (data: PaymentStatusData) => void;
  /** URL to redirect to on success (after delay) */
  successRedirectUrl?: string;
  /** Delay before auto-redirect in milliseconds (default: 3000) */
  redirectDelay?: number;
  /** Maximum time to poll in milliseconds (default: 300000 = 5 minutes) */
  maxPollDuration?: number;
  /** Polling interval in milliseconds (default: 3000) */
  pollInterval?: number;
}

/** Status display configuration */
interface StatusConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  tagColor: string;
  isTerminal: boolean;
}

const STATUS_CONFIG: Record<OnlinePaymentStatus, StatusConfig> = {
  PENDING: {
    icon: <ClockCircleOutlined style={{ fontSize: 48, color: '#faad14' }} />,
    title: 'Payment Pending',
    description: 'Waiting for payment authorization...',
    color: '#faad14',
    tagColor: 'warning',
    isTerminal: false,
  },
  PROCESSING: {
    icon: <SyncOutlined spin style={{ fontSize: 48, color: '#1677ff' }} />,
    title: 'Processing Payment',
    description: 'Your payment is being processed. Please do not close this page.',
    color: '#1677ff',
    tagColor: 'processing',
    isTerminal: false,
  },
  COMPLETED: {
    icon: <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />,
    title: 'Payment Successful',
    description: 'Your payment has been completed successfully.',
    color: '#52c41a',
    tagColor: 'success',
    isTerminal: true,
  },
  FAILED: {
    icon: <CloseCircleOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />,
    title: 'Payment Failed',
    description: 'Your payment could not be completed. Please try again.',
    color: '#ff4d4f',
    tagColor: 'error',
    isTerminal: true,
  },
  REFUNDED: {
    icon: <ExclamationCircleOutlined style={{ fontSize: 48, color: '#722ed1' }} />,
    title: 'Payment Refunded',
    description: 'This payment has been refunded to your account.',
    color: '#722ed1',
    tagColor: 'purple',
    isTerminal: true,
  },
  EXPIRED: {
    icon: <ClockCircleOutlined style={{ fontSize: 48, color: '#8c8c8c' }} />,
    title: 'Payment Expired',
    description: 'The payment session has expired. Please initiate a new payment.',
    color: '#8c8c8c',
    tagColor: 'default',
    isTerminal: true,
  },
};

/**
 * PaymentStatus Component
 *
 * Polls the payment status API at a configurable interval and displays
 * the current payment state with appropriate visual feedback.
 *
 * States: Pending -> Processing -> Completed/Failed/Expired
 *
 * Features:
 * - Auto-polls until a terminal status is reached
 * - Shows progress indicator during polling
 * - Auto-redirects on success (configurable delay)
 * - Handles timeout (max poll duration)
 * - Manual retry/refresh option
 */
export function PaymentStatus({
  paymentId,
  fetchStatus,
  onSuccess,
  onFailure,
  successRedirectUrl,
  redirectDelay = 3000,
  maxPollDuration = 300000,
  pollInterval = 3000,
}: PaymentStatusProps) {
  const [status, setStatus] = useState<PaymentStatusData | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const hasCalledCallbackRef = useRef(false);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async () => {
    try {
      const data = await fetchStatus(paymentId);
      setStatus(data);
      setError(null);

      const config = STATUS_CONFIG[data.status];

      if (config.isTerminal) {
        stopPolling();

        // Fire callbacks only once
        if (!hasCalledCallbackRef.current) {
          hasCalledCallbackRef.current = true;

          if (data.status === 'COMPLETED' && onSuccess) {
            onSuccess(data);
          } else if (
            (data.status === 'FAILED' || data.status === 'EXPIRED') &&
            onFailure
          ) {
            onFailure(data);
          }

          // Start redirect countdown on success
          if (data.status === 'COMPLETED' && successRedirectUrl) {
            setRedirectCountdown(Math.ceil(redirectDelay / 1000));
          }
        }
      }

      // Check if max poll duration exceeded
      const elapsed = Date.now() - startTimeRef.current;
      setElapsedTime(elapsed);

      if (elapsed >= maxPollDuration && !config.isTerminal) {
        stopPolling();
        setError('Payment status check timed out. You can manually refresh.');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to check payment status';
      setError(message);
      // Don't stop polling on transient errors
    }
  }, [
    paymentId,
    fetchStatus,
    onSuccess,
    onFailure,
    successRedirectUrl,
    redirectDelay,
    maxPollDuration,
    stopPolling,
  ]);

  // Start polling
  useEffect(() => {
    startTimeRef.current = Date.now();
    hasCalledCallbackRef.current = false;

    // Initial fetch
    pollStatus();

    // Set up interval
    intervalRef.current = setInterval(pollStatus, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [pollStatus, pollInterval]);

  // Handle redirect countdown
  useEffect(() => {
    if (redirectCountdown === null || redirectCountdown <= 0) {
      if (redirectCountdown === 0 && successRedirectUrl) {
        window.location.href = successRedirectUrl;
      }
      return;
    }

    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [redirectCountdown, successRedirectUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const handleRetry = () => {
    setError(null);
    setIsPolling(true);
    startTimeRef.current = Date.now();
    hasCalledCallbackRef.current = false;
    pollStatus();
    intervalRef.current = setInterval(pollStatus, pollInterval);
  };

  const currentStatus = status?.status || 'PENDING';
  const config = STATUS_CONFIG[currentStatus];
  const progressPercent = Math.min(
    (elapsedTime / maxPollDuration) * 100,
    100,
  );

  return (
    <Card
      style={{
        maxWidth: 500,
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Status Icon */}
        <div style={{ padding: '16px 0' }}>{config.icon}</div>

        {/* Status Title */}
        <div>
          <Title level={4} style={{ margin: 0, color: config.color }}>
            {config.title}
          </Title>
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            {config.description}
          </Text>
        </div>

        {/* Payment Details */}
        {status && (
          <div
            style={{
              background: '#fafafa',
              borderRadius: 8,
              padding: 16,
              textAlign: 'left',
            }}
          >
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <Text type="secondary">Amount</Text>
                <Text strong>
                  {status.currency} {Number(status.amount).toFixed(2)}
                </Text>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <Text type="secondary">Reference</Text>
                <Text copyable style={{ fontSize: 12 }}>
                  {status.referenceNumber}
                </Text>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <Text type="secondary">Gateway</Text>
                <Tag>{status.gateway}</Tag>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <Text type="secondary">Status</Text>
                <Tag color={config.tagColor}>{currentStatus}</Tag>
              </div>

              {status.invoice && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text type="secondary">Invoice</Text>
                  <Text>{status.invoice.invoiceNumber}</Text>
                </div>
              )}

              {status.errorMessage && (
                <div style={{ marginTop: 4 }}>
                  <Text type="danger" style={{ fontSize: 12 }}>
                    {status.errorMessage}
                  </Text>
                </div>
              )}
            </Space>
          </div>
        )}

        {/* Progress bar while polling */}
        {isPolling && !config.isTerminal && (
          <div>
            <Progress
              percent={progressPercent}
              showInfo={false}
              strokeColor={config.color}
              size="small"
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Checking payment status...
            </Text>
          </div>
        )}

        {/* Redirect countdown */}
        {redirectCountdown !== null && redirectCountdown > 0 && (
          <Text type="secondary">
            Redirecting in {redirectCountdown} second
            {redirectCountdown !== 1 ? 's' : ''}...
          </Text>
        )}

        {/* Error message */}
        {error && (
          <Text type="danger" style={{ fontSize: 13 }}>
            {error}
          </Text>
        )}

        {/* Action buttons */}
        <Space>
          {!isPolling && !config.isTerminal && (
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleRetry}
            >
              Refresh Status
            </Button>
          )}

          {config.isTerminal && currentStatus === 'FAILED' && (
            <Button type="primary" danger onClick={() => window.history.back()}>
              Try Again
            </Button>
          )}

          {config.isTerminal && successRedirectUrl && (
            <Button
              type={currentStatus === 'COMPLETED' ? 'primary' : 'default'}
              href={successRedirectUrl}
            >
              {currentStatus === 'COMPLETED'
                ? 'Continue'
                : 'Back to Invoice'}
            </Button>
          )}
        </Space>
      </Space>
    </Card>
  );
}
