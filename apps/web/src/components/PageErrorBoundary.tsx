'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Result, Typography } from 'antd';
import { ReloadOutlined, HomeOutlined } from '@ant-design/icons';

const { Paragraph, Text } = Typography;

interface PageErrorBoundaryProps {
  children: ReactNode;
  /** Page name for contextual error messaging */
  pageName?: string;
  /** Optional callback invoked when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface PageErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Route-level error boundary designed to wrap entire page content.
 * Provides a full-page error view with reload and navigation options.
 *
 * Usage:
 * ```tsx
 * <PageErrorBoundary pageName="Items">
 *   <ItemsPage />
 * </PageErrorBoundary>
 * ```
 */
export class PageErrorBoundary extends Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  constructor(props: PageErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<PageErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[PageErrorBoundary${this.props.pageName ? ` - ${this.props.pageName}` : ''}] Error:`,
        error
      );
      console.error('[PageErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    this.props.onError?.(error, errorInfo);
  }

  handleReload = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleFullReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const pageContext = this.props.pageName
        ? `on the ${this.props.pageName} page`
        : 'on this page';

      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 'calc(100vh - 200px)',
            padding: 24,
          }}
        >
          <Result
            status="500"
            title="Something went wrong"
            subTitle={`An unexpected error occurred ${pageContext}. Our team has been notified.`}
            extra={[
              <Button
                key="retry"
                type="primary"
                icon={<ReloadOutlined />}
                onClick={this.handleReload}
              >
                Try Again
              </Button>,
              <Button key="reload" onClick={this.handleFullReload}>
                Reload Page
              </Button>,
              <Button
                key="home"
                icon={<HomeOutlined />}
                onClick={() => (window.location.href = '/dashboard')}
              >
                Go to Dashboard
              </Button>,
            ]}
          >
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div style={{ textAlign: 'left', maxWidth: 600, margin: '0 auto' }}>
                <Paragraph>
                  <Text strong style={{ fontSize: 14 }}>
                    Error Details (development only):
                  </Text>
                </Paragraph>
                <Paragraph>
                  <Text code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {this.state.error.message}
                  </Text>
                </Paragraph>
                {this.state.error.stack && (
                  <Paragraph>
                    <details>
                      <summary style={{ cursor: 'pointer', color: '#1890ff' }}>Stack trace</summary>
                      <Text
                        code
                        style={{
                          display: 'block',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontSize: 11,
                          marginTop: 8,
                          maxHeight: 200,
                          overflow: 'auto',
                        }}
                      >
                        {this.state.error.stack}
                      </Text>
                    </details>
                  </Paragraph>
                )}
              </div>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}
