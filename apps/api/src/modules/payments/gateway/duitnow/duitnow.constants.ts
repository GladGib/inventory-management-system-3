/**
 * DuitNow Payment Gateway Constants
 *
 * DuitNow is Malaysia's national real-time payment platform operated by
 * Payments Network Malaysia (PayNet). It supports QR code payments and
 * online banking transfers.
 */

/** DuitNow API endpoints (relative to base URL) */
export const DUITNOW_ENDPOINTS = {
  /** Create a new QR payment request */
  CREATE_QR_PAYMENT: '/api/v1/qr/create',
  /** Create an online banking payment request */
  CREATE_OBW_PAYMENT: '/api/v1/obw/create',
  /** Check payment status */
  PAYMENT_STATUS: '/api/v1/payment/status',
  /** Refund a completed payment */
  REFUND: '/api/v1/payment/refund',
} as const;

/** DuitNow payment types */
export enum DuitNowPaymentType {
  /** QR code based payment */
  QR = 'QR',
  /** Online Banking/Wallet (OBW) payment */
  ONLINE_BANKING = 'OBW',
}

/** DuitNow transaction status codes returned by the API */
export enum DuitNowTransactionStatus {
  PENDING = '00',
  SUCCESSFUL = '01',
  FAILED = '02',
  CANCELLED = '03',
  EXPIRED = '04',
  REFUNDED = '05',
}

/** Human-readable labels for DuitNow statuses */
export const DUITNOW_STATUS_LABELS: Record<string, string> = {
  [DuitNowTransactionStatus.PENDING]: 'Pending',
  [DuitNowTransactionStatus.SUCCESSFUL]: 'Successful',
  [DuitNowTransactionStatus.FAILED]: 'Failed',
  [DuitNowTransactionStatus.CANCELLED]: 'Cancelled',
  [DuitNowTransactionStatus.EXPIRED]: 'Expired',
  [DuitNowTransactionStatus.REFUNDED]: 'Refunded',
};

/** Default configuration values */
export const DUITNOW_DEFAULTS = {
  /** Currency code for Malaysia */
  CURRENCY: 'MYR',
  /** Country code */
  COUNTRY: 'MY',
  /** QR code expiry in minutes */
  QR_EXPIRY_MINUTES: 15,
  /** Payment request timeout in milliseconds */
  REQUEST_TIMEOUT_MS: 30000,
  /** Maximum retry attempts for status checks */
  MAX_RETRY_ATTEMPTS: 3,
  /** Delay between retries in milliseconds */
  RETRY_DELAY_MS: 2000,
} as const;

/** DuitNow sandbox/test configuration */
export const DUITNOW_SANDBOX = {
  API_URL: 'https://sandbox.paynet.my/duitnow',
  MERCHANT_ID: 'SANDBOX_MERCHANT',
} as const;

/** DuitNow production configuration */
export const DUITNOW_PRODUCTION = {
  API_URL: 'https://api.paynet.my/duitnow',
} as const;

/** Response codes from DuitNow API */
export const DUITNOW_RESPONSE_CODES = {
  SUCCESS: '00',
  INVALID_MERCHANT: '01',
  INVALID_AMOUNT: '02',
  INVALID_REFERENCE: '03',
  DUPLICATE_REFERENCE: '04',
  SYSTEM_ERROR: '99',
} as const;
