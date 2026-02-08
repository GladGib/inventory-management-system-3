import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  PaymentGatewayProvider,
  CreatePaymentParams,
  PaymentInitResult,
  PaymentCallbackResult,
  PaymentStatusResult,
} from '../payment-gateway.interface';
import {
  TNG_ENDPOINTS,
  TngPaymentStatus,
  TNG_DEFAULTS,
  TNG_RESPONSE_CODES,
} from './tng.constants';

/**
 * Touch 'n Go eWallet Payment Gateway Provider
 *
 * Implements payment processing via the TNG eWallet merchant API.
 * Uses HMAC-SHA256 signature verification for both outgoing requests
 * and incoming callback validation.
 *
 * Flow:
 * 1. Create payment request with signed payload
 * 2. Redirect buyer to TNG eWallet for authorization
 * 3. TNG sends callback notification with payment result
 * 4. Verify callback signature and process result
 */
@Injectable()
export class TngProvider implements PaymentGatewayProvider {
  private readonly logger = new Logger(TngProvider.name);

  private readonly merchantId: string;
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.merchantId = this.configService.get<string>('TNG_MERCHANT_ID', '');
    this.apiKey = this.configService.get<string>('TNG_API_KEY', '');
    this.secretKey = this.configService.get<string>('TNG_SECRET_KEY', '');
    this.apiUrl = this.configService.get<string>(
      'TNG_API_URL',
      'https://sandbox.tngdigital.com.my',
    );
  }

  /**
   * Create a TNG eWallet payment request.
   *
   * Initiates a payment with TNG and returns a payment URL for the user
   * to authorize the transaction in their TNG eWallet app.
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentInitResult> {
    this.logger.log(
      `Creating TNG eWallet payment: ref=${params.referenceNumber}, amount=${params.amount}`,
    );

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonce();

    const requestPayload: Record<string, string> = {
      merchantId: this.merchantId,
      orderNo: params.referenceNumber,
      amount: params.amount.toFixed(2),
      currency: params.currency || TNG_DEFAULTS.CURRENCY,
      description: params.description || `Payment ${params.referenceNumber}`,
      callbackUrl: params.callbackUrl,
      redirectUrl: params.redirectUrl || '',
      buyerEmail: params.buyerEmail || '',
      buyerName: params.buyerName || '',
      expiryMinutes: TNG_DEFAULTS.PAYMENT_EXPIRY_MINUTES.toString(),
      timestamp,
      nonceStr,
    };

    // Generate signature over sorted payload fields
    requestPayload.signature = this.generateRequestSignature(requestPayload);

    const response = await this.makeApiRequest(
      TNG_ENDPOINTS.CREATE_PAYMENT,
      requestPayload,
    );

    if (response.responseCode !== TNG_RESPONSE_CODES.SUCCESS) {
      this.logger.error(
        `TNG payment creation failed: code=${response.responseCode}, msg=${response.responseMessage}`,
      );
      throw new Error(
        response.responseMessage || 'TNG payment creation failed',
      );
    }

    this.logger.log(
      `TNG payment created: ref=${params.referenceNumber}, tngRef=${response.transactionId}`,
    );

    return {
      paymentUrl: response.paymentUrl || '',
      transactionId: response.transactionId || params.referenceNumber,
    };
  }

  /**
   * Verify and process a TNG eWallet callback notification.
   *
   * Validates the HMAC-SHA256 signature on the callback payload, then
   * maps the TNG status to our internal payment status string.
   */
  async verifyCallback(
    payload: Record<string, string>,
    signature: string,
  ): Promise<PaymentCallbackResult> {
    const referenceNumber = payload.orderNo || payload.referenceNumber || '';
    this.logger.log(`Verifying TNG callback: ref=${referenceNumber}`);

    // Validate the callback signature
    const isValid = this.verifyCallbackSignature(payload, signature);

    if (!isValid) {
      this.logger.warn(
        `TNG callback signature verification failed: ref=${referenceNumber}`,
      );
      return {
        success: false,
        referenceNumber,
        gatewayRef: payload.transactionId || payload.tngTransactionId || '',
        amount: parseFloat(payload.amount || '0'),
        status: 'FAILED',
      };
    }

    const status = this.mapTngStatus(payload.status);

    return {
      success: status === 'COMPLETED',
      referenceNumber,
      gatewayRef: payload.transactionId || payload.tngTransactionId || '',
      amount: parseFloat(payload.amount || '0'),
      status,
    };
  }

  /**
   * Check the current status of a TNG eWallet payment.
   */
  async checkStatus(referenceNumber: string): Promise<PaymentStatusResult> {
    this.logger.log(
      `Checking TNG payment status: ref=${referenceNumber}`,
    );

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonce();

    const requestPayload: Record<string, string> = {
      merchantId: this.merchantId,
      orderNo: referenceNumber,
      timestamp,
      nonceStr,
    };

    requestPayload.signature = this.generateRequestSignature(requestPayload);

    try {
      const response = await this.makeApiRequest(
        TNG_ENDPOINTS.PAYMENT_STATUS,
        requestPayload,
      );

      if (response.responseCode !== TNG_RESPONSE_CODES.SUCCESS) {
        this.logger.warn(
          `TNG status check returned non-success: ${response.responseCode}`,
        );
        return {
          status: 'PENDING',
          gatewayRef: '',
          amount: 0,
        };
      }

      const status = this.mapTngStatus(response.paymentStatus);

      return {
        status,
        gatewayRef: response.transactionId || '',
        amount: response.amount ? parseFloat(response.amount) : 0,
      };
    } catch (error) {
      this.logger.error(
        `TNG status check error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        status: 'PENDING',
        gatewayRef: '',
        amount: 0,
      };
    }
  }

  // ============ Private Helpers ============

  /**
   * Generate HMAC-SHA256 signature for outbound API requests.
   *
   * Sorts payload fields alphabetically, concatenates key=value pairs
   * with '&', then signs with the secret key.
   */
  private generateRequestSignature(payload: Record<string, string>): string {
    // Sort keys alphabetically and exclude the signature field itself
    const sortedKeys = Object.keys(payload)
      .filter((key) => key !== 'signature')
      .sort();

    const signatureString = sortedKeys
      .map((key) => `${key}=${payload[key]}`)
      .join('&');

    return crypto
      .createHmac('sha256', this.secretKey)
      .update(signatureString)
      .digest('hex');
  }

  /**
   * Verify the HMAC-SHA256 signature on an incoming TNG callback.
   */
  private verifyCallbackSignature(
    payload: Record<string, string>,
    receivedSignature: string,
  ): boolean {
    // Use the provided header signature or the signature from the payload
    const sig = receivedSignature || payload.signature;
    if (!sig) {
      return false;
    }

    // Build the expected signature from the callback payload fields
    // (excluding the signature field itself)
    const fieldsToSign: Record<string, string> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (key !== 'signature' && typeof value === 'string') {
        fieldsToSign[key] = value;
      }
    }

    const expectedSignature = this.generateRequestSignature(fieldsToSign);

    // Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(sig, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      );
    } catch {
      return false;
    }
  }

  /**
   * Map TNG payment status to our internal payment status string.
   */
  private mapTngStatus(tngStatus: string | undefined): string {
    switch (tngStatus?.toUpperCase()) {
      case TngPaymentStatus.SUCCESS:
        return 'COMPLETED';
      case TngPaymentStatus.PENDING:
        return 'PENDING';
      case TngPaymentStatus.PROCESSING:
        return 'PROCESSING';
      case TngPaymentStatus.FAILED:
      case TngPaymentStatus.CANCELLED:
        return 'FAILED';
      case TngPaymentStatus.EXPIRED:
        return 'EXPIRED';
      case TngPaymentStatus.REFUNDED:
        return 'REFUNDED';
      default:
        return 'PENDING';
    }
  }

  /**
   * Generate a random nonce string for API request signing.
   */
  private generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Make an HTTP POST request to the TNG API.
   */
  private async makeApiRequest(
    endpoint: string,
    payload: Record<string, string>,
  ): Promise<Record<string, any>> {
    const url = `${this.apiUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        'X-Merchant-ID': this.merchantId,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TNG_DEFAULTS.REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(
        `TNG API returned HTTP ${response.status}: ${response.statusText}`,
      );
    }

    return response.json();
  }
}
