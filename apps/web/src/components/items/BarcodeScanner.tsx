'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Tag, Typography } from 'antd';
import { ScanOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface BarcodeScannerProps {
  /** Callback when a barcode is scanned */
  onScan: (value: string) => void;
  /** Whether the scanner is actively listening */
  isActive: boolean;
  /** Maximum time between keystrokes to consider as barcode input (ms) */
  scanThreshold?: number;
  /** Minimum length of a valid barcode */
  minLength?: number;
}

/**
 * BarcodeScanner listens for rapid keyboard input typical of USB barcode scanners.
 *
 * USB barcode scanners emulate keyboard input: they type characters very quickly
 * (within ~50ms of each other) and end with an Enter key. This component detects
 * that pattern and triggers the onScan callback with the scanned value.
 */
export function BarcodeScanner({
  onScan,
  isActive,
  scanThreshold = 50,
  minLength = 3,
}: BarcodeScannerProps) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
    lastKeyTimeRef.current = 0;
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isActive) return;

      // Don't intercept if user is focused on an input/textarea/select
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          (activeElement as HTMLElement).isContentEditable)
      ) {
        return;
      }

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;

      // If Enter key pressed, check if we have a valid barcode in buffer
      if (event.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          event.preventDefault();
          event.stopPropagation();
          onScan(bufferRef.current);
        }
        resetBuffer();
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        return;
      }

      // Only accept printable characters
      if (event.key.length !== 1) return;

      // If too much time has passed since last key, reset the buffer
      if (lastKeyTimeRef.current > 0 && timeSinceLastKey > scanThreshold) {
        resetBuffer();
      }

      bufferRef.current += event.key;
      lastKeyTimeRef.current = now;

      // Set a timeout to clear the buffer if no more keys come
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        resetBuffer();
      }, scanThreshold * 3);
    },
    [isActive, minLength, onScan, resetBuffer, scanThreshold],
  );

  useEffect(() => {
    if (isActive) {
      window.addEventListener('keydown', handleKeyDown, true);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isActive, handleKeyDown]);

  if (!isActive) return null;

  return (
    <Tag
      color="blue"
      icon={<ScanOutlined />}
      style={{
        animation: 'pulse 2s infinite',
        cursor: 'default',
      }}
    >
      Scanner Active
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </Tag>
  );
}
