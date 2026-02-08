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
  GRABPAY_ENDPOINTS,
  GrabPayChargeStatus,
  GRABPAY_SCOPES,
  GRABPAY_DEFAULTS,
} from './grabpay.constants';

/**
 * Cached OAuth2 access token with expiry tracking.
 */
interface AccessTokenCache {
  accessToken: string;
  expiresAt: Date;
}

/**
 * GrabPay Payment Gateway Provider
 *
 * Implements payment processing via GrabPay's Partner API. Uses OAuth2
 * client_credentials flow for API authentication and supports one-time
 * charge creation with webhook-based status updates.
 *
 * Flow:
 * 1. Obtain OAuth2 access token (cached with auto-refresh)
 * 2. Create charge via Partner API -> receive redirect URL
 * 3. Redirect buyer to GrabPay for authorization
 * 4. Receive webhook callback with payment result
 */
@Injectable()
export class GrabPayProvider implements PaymentGatewayProvider {
  private readonly logger = new Logger(GrabPayProvider.name);

  private readonly merchantId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly apiUrl: string;

  /** Cached OAuth2 access token */
  private tokenCache: AccessTokenCache | null = null;

  constructor(private readonly configService: ConfigService) {
    this.merchantId = this.configService.get<string>('GRABPAY_MERCHANT_ID', '');
    this.clientId = this.configService.get<string>('GRABPAY_CLIENT_ID', '');
    this.clientSecret = this.configService.get<string>('GRABPAY_CLIENT_SECRET', '');
    this.apiUrl = this.configService.get<string>(
      'GRABPAY_API_URL',
      'https://partner-gw.stg-myteksi.com',
    );
  }

  /**
   * Create a GrabPay charge.
   *
   * Initiates a one-time charge via the GrabPay Partner API. Returns a
   * payment URL that the buyer should be redirected to for authorization
   * in their Grab app.
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentInitResult> {
    this.logger.log(
      `Creating GrabPay charge: ref=${params.referenceNumber}, amount=${params.amount}`,
    );

    const accessToken = await this.getAccessToken();
    const partnerTxID = params.referenceNumber;

    const payload = {
      partnerGroupTxID: partnerTxID,
      partnerTxID,
      merchantID: this.merchantId,
      amount: Math.round(params.amount * 100), // GrabPay uses minor units (cents)
      currency: params.currency || GRABPAY_DEFAULTS.CURRENCY,
      description:
        params.description ||
        `${GRABPAY_DEFAULTS.DESCRIPTION_PREFIX} ${params.referenceNumber}`,
      metaInfo: {
        referenceNumber: params.referenceNumber,
        buyerEmail: params.buyerEmail || '',
        buyerName: params.buyerName || '',
      },
      hidePaymentMethods: [],
    };

    const requestBody = JSON.stringify(payload);
    const hmacSignature = this.generateRequestSignature(
      'POST',
      GRABPAY_ENDPOINTS.CREATE_CHARGE,
      'application/json',
      requestBody,
      new Date().toISOString(),
    );

    const response = await this.makeApiRequest(
      GRABPAY_ENDPOINTS.CREATE_CHARGE,
      payload,
      accessToken,
      hmacSignature,
    );

    if (!response.request || !response.request.redirectUri) {
      this.logger.error(
        `GrabPay charge creation failed: ${JSON.stringify(response)}`,
      );
      throw new Error(
        response.message || 'Failed to create GrabPay charge',
      );
    }

    // Build the payment URL with redirect
    let paymentUrl = response.request.redirectUri;
    if (params.redirectUrl) {
      const url = new URL(paymentUrl);
      url.searchParams.set('redirect_uri', params.redirectUrl);
      paymentUrl = url.toString();
    }

    this.logger.log(
      `GrabPay charge created: ref=${params.referenceNumber}, txID=${response.txID || partnerTxID}`,
    );

    return {
      paymentUrl,
      transactionId: response.txID || partnerTxID,
    };
  }

  /**
   * Verify and process a GrabPay webhook notification.
   *
   * Validates the webhook HMAC signature and maps GrabPay status to
   * our internal payment status.
   */
  async verifyCallback(
    payload: Record<string, any>,
    signature: string,
  ): Promise<PaymentCallbackResult> {
    const referenceNumber =
      payload.partnerTxID || payload.merchantTxID || '';
    this.logger.log(`Verifying GrabPay webhook: ref=${referenceNumber}`);

    // Verify webhook HMAC signature
    const isValid = this.verifyWebhookSignature(payload, signature);

    if (!isValid) {
      this.logger.warn(
        `GrabPay webhook signature verification failed: ref=${referenceNumber}`,
      );
      return {
        success: false,
        referenceNumber,
        gatewayRef: payload.txID || payload.grabTxID || '',
        amount: payload.amount ? payload.amount / 100 : 0,
        status: 'FAILED',
      };
    }

    const status = this.mapGrabPayStatus(payload.status || payload.txStatus);

    // GrabPay amounts are in minor units (cents), convert back
    const amount = payload.amount ? payload.amount / 100 : 0;

    return {
      success: status === 'COMPLETED',
      referenceNumber,
      gatewayRef: payload.txID || payload.grabTxID || '',
      amount,
      status,
    };
  }

  /**
   * Check the current status of a GrabPay charge.
   */
  async checkStatus(referenceNumber: string): Promise<PaymentStatusResult> {
    this.logger.log(
      `Checking GrabPay charge status: ref=${referenceNumber}`,
    );

    try {
      const accessToken = await this.getAccessToken();

      const queryParams = new URLSearchParams({
        partnerTxID: referenceNumber,
        currency: GRABPAY_DEFAULTS.CURRENCY,
      });

      const url = `${GRABPAY_ENDPOINTS.CHARGE_STATUS}/${referenceNumber}/status?${queryParams.toString()}`;

      const response = await this.makeApiGetRequest(url, accessToken);

      const status = this.mapGrabPayStatus(
        response.txStatus || response.status,
      );
      const amount = response.amount ? response.amount / 100 : 0;

      return {
        status,
        gatewayRef: response.txID || response.grabTxID || '',
        amount,
      };
    } catch (error) {
      this.logger.error(
        `GrabPay status check error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        status: 'PENDING',
        gatewayRef: '',
        amount: 0,
      };
    }
  }

  // ============ OAuth2 Token Management ============

  /**
   * Get a valid OAuth2 access token, refreshing if needed.
   *
   * Caches the token in memory and automatically refreshes it
   * when it is close to expiry (within the buffer window).
   */
  private async getAccessToken(): Promise<string> {
    if (this.tokenCache && this.isTokenValid(this.tokenCache)) {
      return this.tokenCache.accessToken;
    }

    this.logger.debug('Refreshing GrabPay OAuth2 access token');

    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'client_credentials',
      scope: GRABPAY_SCOPES.PAYMENT,
    });

    const url = `${this.apiUrl}${GRABPAY_ENDPOINTS.TOKEN}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(GRABPAY_DEFAULTS.REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GrabPay token request failed (HTTP ${response.status}): ${errorText}`,
      );
    }

    const tokenData = await response.json();

    const expiresInSeconds = tokenData.expires_in || 3600;
    const expiresAt = new Date(
      Date.now() +
        (expiresInSeconds - GRABPAY_DEFAULTS.TOKEN_EXPIRY_BUFFER_SECONDS) *
          1000,
    );

    this.tokenCache = {
      accessToken: tokenData.access_token,
      expiresAt,
    };

    this.logger.debug(
      `GrabPay OAuth2 token refreshed, expires at ${expiresAt.toISOString()}`,
    );

    return this.tokenCache.accessToken;
  }

  /**
   * Check if a cached token is still valid (not expired).
   */
  private isTokenValid(cache: AccessTokenCache): boolean {
    return cache.expiresAt.getTime() > Date.now();
  }

  // ============ Signature Helpers ============

  /**
   * Generate HMAC-SHA256 signature for outbound API requests.
   *
   * GrabPay's Partner API requires HMAC signatures on all requests
   * for additional security beyond the OAuth2 bearer token.
   */
  private generateRequestSignature(
    httpMethod: string,
    apiPath: string,
    contentType: string,
    requestBody: string,
    date: string,
  ): string {
    const hashedBody = crypto
      .createHash('sha256')
      .update(requestBody)
      .digest('base64');

    const signingString = [
      httpMethod,
      contentType,
      date,
      apiPath,
      hashedBody,
    ].join('\n');

    return crypto
      .createHmac('sha256', this.clientSecret)
      .update(signingString)
      .digest('base64');
  }

  /**
   * Verify the HMAC signature on an incoming GrabPay webhook.
   */
  private verifyWebhookSignature(
    payload: Record<string, any>,
    receivedSignature: string,
  ): boolean {
    if (!receivedSignature) {
      return false;
    }

    // GrabPay webhook signature is computed over the raw JSON body
    const rawBody = JSON.stringify(payload);

    const expectedSignature = crypto
      .createHmac('sha256', this.clientSecret)
      .update(rawBody)
      .digest('base64');

    // Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(receivedSignature),
        Buffer.from(expectedSignature),
      );
    } catch {
      return false;
    }
  }

  /**
   * Map GrabPay charge status to our internal payment status string.
   */
  private mapGrabPayStatus(grabStatus: string | undefined): string {
    switch (grabStatus?.toLowerCase()) {
      case GrabPayChargeStatus.COMPLETED:
        return 'COMPLETED';
      case GrabPayChargeStatus.INIT:
        return 'PENDING';
      case GrabPayChargeStatus.AUTHORIZED:
        return 'PROCESSING';
      case GrabPayChargeStatus.FAILED:
      case GrabPayChargeStatus.VOIDED:
        return 'FAILED';
      case GrabPayChargeStatus.REFUNDED:
        return 'REFUNDED';
      default:
        return 'PENDING';
    }
  }

  /**
   * Make an authenticated POST request to the GrabPay API.
   */
  private async makeApiRequest(
    endpoint: string,
    payload: Record<string, unknown>,
    accessToken: string,
    hmacSignature?: string,
  ): Promise<Record<string, any>> {
    const url = `${this.apiUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Date': new Date().toUTCString(),
    };

    if (hmacSignature) {
      headers['X-GID-AUX-POP'] = hmacSignature;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(GRABPAY_DEFAULTS.REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GrabPay API returned HTTP ${response.status}: ${errorText}`,
      );
    }

    return response.json();
  }

  /**
   * Make an authenticated GET request to the GrabPay API.
   */
  private async makeApiGetRequest(
    endpoint: string,
    accessToken: string,
  ): Promise<Record<string, any>> {
    const url = `${this.apiUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Date': new Date().toUTCString(),
      },
      signal: AbortSignal.timeout(GRABPAY_DEFAULTS.REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GrabPay API returned HTTP ${response.status}: ${errorText}`,
      );
    }

    return response.json();
  }
}
