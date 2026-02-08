/**
 * GrabPay Payment Gateway Constants
 *
 * GrabPay is Grab's e-wallet service widely used across Southeast Asia.
 * The integration uses Grab's Partner API with OAuth2 authentication.
 */

/** GrabPay API endpoints (relative to base URL) */
export const GRABPAY_ENDPOINTS = {
  /** OAuth2 token endpoint */
  TOKEN: '/grabid/v1/oauth2/token',
  /** Create a new charge / payment */
  CREATE_CHARGE: '/grabpay/partner/v2/charge/init',
  /** Complete / confirm a charge */
  COMPLETE_CHARGE: '/grabpay/partner/v2/charge/complete',
  /** Check charge status */
  CHARGE_STATUS: '/grabpay/partner/v2/charge',
  /** Refund a charge */
  REFUND: '/grabpay/partner/v2/refund',
} as const;

/** GrabPay charge/payment statuses */
export enum GrabPayChargeStatus {
  /** Charge initiated, waiting for user authorisation */
  INIT = 'init',
  /** User authorised, pending completion */
  AUTHORIZED = 'authorized',
  /** Payment completed successfully */
  COMPLETED = 'completed',
  /** Payment failed */
  FAILED = 'failed',
  /** Payment was voided/cancelled */
  VOIDED = 'voided',
  /** Payment refunded */
  REFUNDED = 'refunded',
}

/** GrabPay OAuth2 scopes */
export const GRABPAY_SCOPES = {
  /** Payment scope for creating charges */
  PAYMENT: 'payment.one_time_charge',
} as const;

/** Default configuration values */
export const GRABPAY_DEFAULTS = {
  /** Currency code for Malaysia */
  CURRENCY: 'MYR',
  /** Country code */
  COUNTRY: 'MY',
  /** OAuth2 token expiry buffer in seconds (refresh 60s before expiry) */
  TOKEN_EXPIRY_BUFFER_SECONDS: 60,
  /** Payment request timeout in milliseconds */
  REQUEST_TIMEOUT_MS: 30000,
  /** Maximum retry attempts */
  MAX_RETRY_ATTEMPTS: 3,
  /** Delay between retries in milliseconds */
  RETRY_DELAY_MS: 2000,
  /** Default description prefix */
  DESCRIPTION_PREFIX: 'IMS Payment',
} as const;

/** GrabPay sandbox/test configuration */
export const GRABPAY_SANDBOX = {
  API_URL: 'https://partner-gw.stg-myteksi.com',
  /** Test OAuth2 endpoint */
  AUTH_URL: 'https://partner-gw.stg-myteksi.com',
} as const;

/** GrabPay production configuration */
export const GRABPAY_PRODUCTION = {
  API_URL: 'https://partner-gw.grab.com',
  AUTH_URL: 'https://partner-gw.grab.com',
} as const;

/** GrabPay error codes */
export const GRABPAY_ERROR_CODES = {
  INVALID_REQUEST: 'invalid_request',
  UNAUTHORIZED: 'unauthorized',
  INSUFFICIENT_BALANCE: 'insufficient_balance',
  DUPLICATE_REQUEST: 'duplicate_request',
  CHARGE_NOT_FOUND: 'charge_not_found',
  INTERNAL_ERROR: 'internal_error',
} as const;
