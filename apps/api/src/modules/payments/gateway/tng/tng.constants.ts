/**
 * Touch 'n Go (TNG) eWallet Payment Gateway Constants
 *
 * Touch 'n Go eWallet is one of Malaysia's most popular digital wallets.
 * The API uses HMAC-SHA256 signatures for request authentication.
 */

/** TNG eWallet API endpoints (relative to base URL) */
export const TNG_ENDPOINTS = {
  /** Create a new eWallet payment request */
  CREATE_PAYMENT: '/api/v1/payment/create',
  /** Query payment status */
  PAYMENT_STATUS: '/api/v1/payment/query',
  /** Refund a completed payment */
  REFUND: '/api/v1/payment/refund',
  /** Close/cancel a pending payment */
  CLOSE_PAYMENT: '/api/v1/payment/close',
} as const;

/** TNG eWallet payment statuses */
export enum TngPaymentStatus {
  /** Payment created, awaiting user action */
  PENDING = 'PENDING',
  /** User has initiated payment, processing */
  PROCESSING = 'PROCESSING',
  /** Payment completed successfully */
  SUCCESS = 'SUCCESS',
  /** Payment failed */
  FAILED = 'FAILED',
  /** Payment was cancelled by user */
  CANCELLED = 'CANCELLED',
  /** Payment expired before completion */
  EXPIRED = 'EXPIRED',
  /** Payment was refunded */
  REFUNDED = 'REFUNDED',
}

/** Default configuration values */
export const TNG_DEFAULTS = {
  /** Currency code for Malaysia */
  CURRENCY: 'MYR',
  /** Country code */
  COUNTRY: 'MY',
  /** Payment expiry in minutes */
  PAYMENT_EXPIRY_MINUTES: 15,
  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT_MS: 30000,
  /** Maximum retry attempts for status checks */
  MAX_RETRY_ATTEMPTS: 3,
  /** Delay between retries in milliseconds */
  RETRY_DELAY_MS: 2000,
  /** Signature algorithm */
  SIGNATURE_ALGORITHM: 'SHA256' as const,
} as const;

/** TNG eWallet sandbox/test configuration */
export const TNG_SANDBOX = {
  API_URL: 'https://sandbox.tngdigital.com.my',
  MERCHANT_ID: 'TNG_SANDBOX',
} as const;

/** TNG eWallet production configuration */
export const TNG_PRODUCTION = {
  API_URL: 'https://api.tngdigital.com.my',
} as const;

/** TNG API response codes */
export const TNG_RESPONSE_CODES = {
  /** Request processed successfully */
  SUCCESS: '0000',
  /** Invalid merchant */
  INVALID_MERCHANT: '1001',
  /** Invalid amount */
  INVALID_AMOUNT: '1002',
  /** Duplicate order */
  DUPLICATE_ORDER: '1003',
  /** Invalid signature */
  INVALID_SIGNATURE: '1004',
  /** Order not found */
  ORDER_NOT_FOUND: '1005',
  /** Merchant not active */
  MERCHANT_NOT_ACTIVE: '1006',
  /** System error */
  SYSTEM_ERROR: '9999',
} as const;

/** Human-readable labels for TNG response codes */
export const TNG_RESPONSE_LABELS: Record<string, string> = {
  [TNG_RESPONSE_CODES.SUCCESS]: 'Success',
  [TNG_RESPONSE_CODES.INVALID_MERCHANT]: 'Invalid merchant',
  [TNG_RESPONSE_CODES.INVALID_AMOUNT]: 'Invalid amount',
  [TNG_RESPONSE_CODES.DUPLICATE_ORDER]: 'Duplicate order',
  [TNG_RESPONSE_CODES.INVALID_SIGNATURE]: 'Invalid signature',
  [TNG_RESPONSE_CODES.ORDER_NOT_FOUND]: 'Order not found',
  [TNG_RESPONSE_CODES.MERCHANT_NOT_ACTIVE]: 'Merchant not active',
  [TNG_RESPONSE_CODES.SYSTEM_ERROR]: 'System error',
};
