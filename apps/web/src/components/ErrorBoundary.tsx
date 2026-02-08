'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Result } from 'antd';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional callback invoked when an error is caught, useful for logging services */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Optional custom fallback UI. If not provided, a default fallback is shown. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Generic React error boundary with Ant Design styling.
 * Catches JavaScript errors in child component tree and displays a fallback UI.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary onError={(err) => logToService(err)}>
 *   <SomeComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    // Invoke optional callback for external logging
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Result
          status="error"
          title="Something went wrong"
          subTitle={
            process.env.NODE_ENV === 'development' && this.state.error
              ? this.state.error.message
              : 'An unexpected error occurred. Please try again.'
          }
          extra={[
            <Button key="retry" type="primary" onClick={this.handleReset}>
              Try Again
            </Button>,
            <Button key="home" onClick={() => (window.location.href = '/')}>
              Go to Dashboard
            </Button>,
          ]}
        />
      );
    }

    return this.props.children;
  }
}
