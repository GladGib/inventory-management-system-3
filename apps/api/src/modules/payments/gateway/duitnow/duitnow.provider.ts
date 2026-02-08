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
  DUITNOW_ENDPOINTS,
  DuitNowPaymentType,
  DuitNowTransactionStatus,
  DUITNOW_DEFAULTS,
  DUITNOW_RESPONSE_CODES,
} from './duitnow.constants';

/**
 * DuitNow Payment Gateway Provider
 *
 * Implements payment processing via Malaysia's DuitNow real-time payment
 * platform (operated by PayNet). Supports both DuitNow QR code payments
 * and DuitNow Online Banking/Wallet (OBW) transfers.
 *
 * DuitNow QR is used by default. To use Online Banking mode, pass
 * `bankCode` with the value 'OBW' in the CreatePaymentParams.
 */
@Injectable()
export class DuitNowProvider implements PaymentGatewayProvider {
  private readonly logger = new Logger(DuitNowProvider.name);

  private readonly merchantId: string;
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.merchantId = this.configService.get<string>('DUITNOW_MERCHANT_ID', '');
    this.apiKey = this.configService.get<string>('DUITNOW_API_KEY', '');
    this.apiUrl = this.configService.get<string>(
      'DUITNOW_API_URL',
      'https://sandbox.paynet.my/duitnow',
    );
  }

  /**
   * Create a DuitNow payment request.
   *
   * Generates either a QR code payment or an Online Banking/Wallet (OBW)
   * redirect. Uses QR mode by default; pass bankCode='OBW' for online
   * banking mode.
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentInitResult> {
    this.logger.log(
      `Creating DuitNow payment: ref=${params.referenceNumber}, amount=${params.amount}`,
    );

    // Determine payment type: OBW if bankCode is 'OBW', otherwise QR
    const paymentType =
      params.bankCode === 'OBW'
        ? DuitNowPaymentType.ONLINE_BANKING
        : DuitNowPaymentType.QR;

    const endpoint =
      paymentType === DuitNowPaymentType.QR
        ? DUITNOW_ENDPOINTS.CREATE_QR_PAYMENT
        : DUITNOW_ENDPOINTS.CREATE_OBW_PAYMENT;

    const timestamp = new Date().toISOString();
    const signature = this.generateSignature(
      params.referenceNumber,
      params.amount.toString(),
      timestamp,
    );

    const requestPayload = {
      merchantId: this.merchantId,
      referenceNumber: params.referenceNumber,
      amount: params.amount.toFixed(2),
      currency: params.currency || DUITNOW_DEFAULTS.CURRENCY,
      paymentType,
      description: params.description || '',
      buyerEmail: params.buyerEmail || '',
      buyerName: params.buyerName || '',
      callbackUrl: params.callbackUrl,
      redirectUrl: params.redirectUrl || '',
      expiryMinutes: DUITNOW_DEFAULTS.QR_EXPIRY_MINUTES,
      timestamp,
      signature,
    };

    const response = await this.makeApiRequest(endpoint, requestPayload);

    if (response.responseCode !== DUITNOW_RESPONSE_CODES.SUCCESS) {
      this.logger.error(
        `DuitNow payment creation failed: code=${response.responseCode}, msg=${response.responseMessage}`,
      );
      throw new Error(
        response.responseMessage || 'DuitNow payment creation failed',
      );
    }

    this.logger.log(
      `DuitNow payment created: ref=${params.referenceNumber}, gatewayRef=${response.transactionId}`,
    );

    // For QR payments, the paymentUrl may contain the QR content
    // For OBW payments, it contains the redirect URL
    const paymentUrl = response.paymentUrl || response.qrContent || '';

    return {
      paymentUrl,
      transactionId: response.transactionId || params.referenceNumber,
    };
  }

  /**
   * Verify and process a DuitNow callback/notification.
   *
   * Validates the callback signature to ensure authenticity, then maps
   * the DuitNow status code to our internal payment status string.
   */
  async verifyCallback(
    payload: Record<string, string>,
    signature: string,
  ): Promise<PaymentCallbackResult> {
    const referenceNumber = payload.referenceNumber || payload.orderNo || '';
    this.logger.log(`Verifying DuitNow callback: ref=${referenceNumber}`);

    // Validate the callback signature
    const isValid = this.verifyCallbackSignature(payload, signature);

    if (!isValid) {
      this.logger.warn(
        `DuitNow callback signature verification failed: ref=${referenceNumber}`,
      );
      return {
        success: false,
        referenceNumber,
        gatewayRef: payload.transactionId || '',
        amount: parseFloat(payload.amount || '0'),
        status: 'FAILED',
      };
    }

    const status = this.mapDuitNowStatus(payload.status);

    return {
      success: status === 'COMPLETED',
      referenceNumber,
      gatewayRef: payload.transactionId || '',
      amount: parseFloat(payload.amount || '0'),
      status,
    };
  }

  /**
   * Check the current status of a DuitNow payment.
   */
  async checkStatus(referenceNumber: string): Promise<PaymentStatusResult> {
    this.logger.log(
      `Checking DuitNow payment status: ref=${referenceNumber}`,
    );

    const timestamp = new Date().toISOString();
    const signature = this.generateSignature(referenceNumber, '', timestamp);

    const requestPayload = {
      merchantId: this.merchantId,
      referenceNumber,
      timestamp,
      signature,
    };

    try {
      const response = await this.makeApiRequest(
        DUITNOW_ENDPOINTS.PAYMENT_STATUS,
        requestPayload,
      );

      if (response.responseCode !== DUITNOW_RESPONSE_CODES.SUCCESS) {
        this.logger.warn(
          `DuitNow status check returned non-success: ${response.responseCode}`,
        );
        return {
          status: 'PENDING',
          gatewayRef: '',
          amount: 0,
        };
      }

      const status = this.mapDuitNowStatus(response.paymentStatus);

      return {
        status,
        gatewayRef: response.transactionId || '',
        amount: response.amount ? parseFloat(response.amount) : 0,
      };
    } catch (error) {
      this.logger.error(
        `DuitNow status check error: ${error instanceof Error ? error.message : String(error)}`,
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
   */
  private generateSignature(
    referenceNumber: string,
    amount: string,
    timestamp: string,
  ): string {
    const data = `${this.merchantId}|${referenceNumber}|${amount}|${timestamp}`;
    return crypto
      .createHmac('sha256', this.apiKey)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify the signature of an incoming DuitNow callback.
   *
   * The callback payload fields are concatenated with '|' and signed
   * with the merchant API key using HMAC-SHA256.
   */
  private verifyCallbackSignature(
    payload: Record<string, string>,
    receivedSignature: string,
  ): boolean {
    // Use the signature from the payload or the provided header signature
    const sig = receivedSignature || payload.signature;
    if (!sig) {
      return false;
    }

    const signatureData = [
      payload.merchantId || this.merchantId,
      payload.referenceNumber || payload.orderNo,
      payload.amount,
      payload.transactionId,
      payload.status,
    ].join('|');

    const expectedSignature = crypto
      .createHmac('sha256', this.apiKey)
      .update(signatureData)
      .digest('hex');

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
   * Map DuitNow status codes to our internal payment status strings.
   */
  private mapDuitNowStatus(duitnowStatus: string | undefined): string {
    switch (duitnowStatus) {
      case DuitNowTransactionStatus.SUCCESSFUL:
        return 'COMPLETED';
      case DuitNowTransactionStatus.PENDING:
        return 'PENDING';
      case DuitNowTransactionStatus.FAILED:
      case DuitNowTransactionStatus.CANCELLED:
        return 'FAILED';
      case DuitNowTransactionStatus.EXPIRED:
        return 'EXPIRED';
      case DuitNowTransactionStatus.REFUNDED:
        return 'REFUNDED';
      default:
        return 'PENDING';
    }
  }

  /**
   * Make an HTTP POST request to the DuitNow API.
   *
   * Uses native fetch (available in Node 18+) to avoid adding
   * extra HTTP client dependencies.
   */
  private async makeApiRequest(
    endpoint: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, any>> {
    const url = `${this.apiUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Merchant-ID': this.merchantId,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(DUITNOW_DEFAULTS.REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(
        `DuitNow API returned HTTP ${response.status}: ${response.statusText}`,
      );
    }

    return response.json();
  }
}
