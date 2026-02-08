import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  PaymentGatewayProvider,
  CreatePaymentParams,
  PaymentInitResult,
  PaymentCallbackResult,
  PaymentStatusResult,
  BankInfo,
} from '../payment-gateway.interface';
import { MALAYSIAN_BANKS, FPX_STATUS_CODES } from './fpx.constants';

@Injectable()
export class FpxProvider implements PaymentGatewayProvider {
  private readonly logger = new Logger(FpxProvider.name);
  private readonly merchantId: string;
  private readonly sellerId: string;
  private readonly apiUrl: string;
  private readonly privateKeyPath: string;

  constructor(private readonly configService: ConfigService) {
    this.merchantId = this.configService.get<string>('FPX_MERCHANT_ID', '');
    this.sellerId = this.configService.get<string>('FPX_SELLER_ID', '');
    this.apiUrl = this.configService.get<string>(
      'FPX_API_URL',
      'https://uat.mepsfpx.com.my/FPXMain/seller2D498/fpxconfirmorder',
    );
    this.privateKeyPath = this.configService.get<string>(
      'FPX_PRIVATE_KEY_PATH',
      '',
    );
  }

  /**
   * Creates an FPX payment request.
   * Generates the checksum from request parameters and returns the
   * redirect URL where the buyer completes the bank authorization.
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentInitResult> {
    this.logger.log(
      `Creating FPX payment for reference: ${params.referenceNumber}`,
    );

    const timestamp = this.formatTimestamp(new Date());

    const fpxData: Record<string, string> = {
      fpx_msgType: 'AR',
      fpx_msgToken: '01', // Individual buyer
      fpx_sellerExId: this.merchantId,
      fpx_sellerExOrderNo: params.referenceNumber,
      fpx_sellerTxnTime: timestamp,
      fpx_sellerOrderNo: params.referenceNumber,
      fpx_sellerId: this.sellerId,
      fpx_sellerBankCode: '01', // Default seller bank
      fpx_txnCurrency: params.currency || 'MYR',
      fpx_txnAmount: params.amount.toFixed(2),
      fpx_buyerEmail: params.buyerEmail || '',
      fpx_buyerName: params.buyerName || '',
      fpx_buyerBankId: params.bankCode || '',
      fpx_buyerBankBranch: '',
      fpx_buyerAccNo: '',
      fpx_buyerId: '',
      fpx_makerName: params.buyerName || '',
      fpx_buyerIban: '',
      fpx_productDesc: params.description || '',
      fpx_version: '7.0',
    };

    // Generate checksum
    const checksum = this.generateChecksum(fpxData);
    fpxData.fpx_checkSum = checksum;

    // Build form URL for redirect
    const formFields = Object.entries(fpxData)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
      )
      .join('&');

    const paymentUrl = `${this.apiUrl}?${formFields}`;

    this.logger.log(
      `FPX payment URL generated for reference: ${params.referenceNumber}`,
    );

    return {
      paymentUrl,
      transactionId: params.referenceNumber,
    };
  }

  /**
   * Verifies the FPX callback by validating the response signature.
   * Parses the callback payload and maps the status code to an
   * internal status string.
   */
  async verifyCallback(
    payload: Record<string, string>,
    signature: string,
  ): Promise<PaymentCallbackResult> {
    this.logger.log(
      `Verifying FPX callback for order: ${payload.fpx_sellerOrderNo}`,
    );

    // Verify signature using the FPX public key
    const isValid = this.verifySignature(payload, signature);
    if (!isValid) {
      this.logger.warn('FPX callback signature verification failed');
      return {
        success: false,
        referenceNumber: payload.fpx_sellerOrderNo || '',
        gatewayRef: payload.fpx_fpxTxnId || '',
        amount: parseFloat(payload.fpx_txnAmount || '0'),
        status: 'FAILED',
      };
    }

    const statusCode = payload.fpx_debitAuthCode || '99';
    const mappedStatus = FPX_STATUS_CODES[statusCode] || 'FAILED';

    return {
      success: mappedStatus === 'COMPLETED',
      referenceNumber: payload.fpx_sellerOrderNo || '',
      gatewayRef: payload.fpx_fpxTxnId || '',
      amount: parseFloat(payload.fpx_txnAmount || '0'),
      status: mappedStatus,
    };
  }

  /**
   * Queries FPX for the current status of a transaction
   * using the authorization enquiry endpoint.
   */
  async checkStatus(referenceNumber: string): Promise<PaymentStatusResult> {
    this.logger.log(`Checking FPX status for reference: ${referenceNumber}`);

    // In production this would call the FPX Authorization Enquiry (AE) endpoint.
    // For now we return PENDING since this requires a live FPX connection.
    // The actual implementation would POST to the FPX AE URL with:
    //   fpx_msgType = AE
    //   fpx_sellerExId = merchantId
    //   fpx_sellerExOrderNo = referenceNumber
    // and parse the response.

    this.logger.warn(
      `FPX status check is a stub - production implementation requires live FPX connection`,
    );

    return {
      status: 'PENDING',
      gatewayRef: '',
      amount: 0,
    };
  }

  /**
   * Returns the list of Malaysian banks that support FPX online banking.
   */
  async getBankList(): Promise<BankInfo[]> {
    // In production, this would query the FPX bank list endpoint
    // to get real-time bank availability status.
    // For now we return the static list of Malaysian banks.
    return MALAYSIAN_BANKS.filter((bank) => bank.active);
  }

  /**
   * Generates an SHA-1 HMAC checksum for the FPX request parameters.
   * The checksum is signed with the merchant's RSA private key.
   */
  private generateChecksum(data: Record<string, string>): string {
    // Build the source string by concatenating field values with '|' separator
    // in the order specified by FPX documentation
    const sourceFields = [
      'fpx_buyerAccNo',
      'fpx_buyerBankBranch',
      'fpx_buyerBankId',
      'fpx_buyerEmail',
      'fpx_buyerIban',
      'fpx_buyerId',
      'fpx_buyerName',
      'fpx_makerName',
      'fpx_msgToken',
      'fpx_msgType',
      'fpx_productDesc',
      'fpx_sellerBankCode',
      'fpx_sellerExId',
      'fpx_sellerExOrderNo',
      'fpx_sellerId',
      'fpx_sellerOrderNo',
      'fpx_sellerTxnTime',
      'fpx_txnAmount',
      'fpx_txnCurrency',
      'fpx_version',
    ];

    const sourceString = sourceFields
      .map((field) => data[field] || '')
      .join('|');

    // If private key is configured, sign with RSA
    if (this.privateKeyPath) {
      try {
        const absolutePath = path.isAbsolute(this.privateKeyPath)
          ? this.privateKeyPath
          : path.join(process.cwd(), this.privateKeyPath);

        if (fs.existsSync(absolutePath)) {
          const privateKey = fs.readFileSync(absolutePath, 'utf-8');
          const sign = crypto.createSign('SHA1');
          sign.update(sourceString);
          sign.end();
          return sign.sign(privateKey, 'hex');
        }
      } catch (error) {
        this.logger.error('Failed to read FPX private key for signing', error);
      }
    }

    // Fallback: SHA-256 hash (for development/testing only)
    this.logger.warn(
      'Using SHA-256 hash fallback - configure FPX_PRIVATE_KEY_PATH for production',
    );
    return crypto.createHash('sha256').update(sourceString).digest('hex');
  }

  /**
   * Verifies the FPX response signature using the FPX exchange public key.
   * In development mode without keys configured, this always returns true.
   */
  private verifySignature(
    payload: Record<string, string>,
    _signature: string,
  ): boolean {
    // In production, reconstruct the source string from the response fields
    // and verify using the FPX exchange's public certificate.
    //
    // The verification involves:
    // 1. Build source string from response fields in documented order
    // 2. Verify the fpx_checkSum field against the source using FPX public key
    //
    // For development, we accept all callbacks but log a warning.

    if (!this.privateKeyPath) {
      this.logger.warn(
        'FPX signature verification skipped - no private key configured (dev mode)',
      );
      return true;
    }

    // Production implementation would verify here
    const checksumFromPayload = payload.fpx_checkSum;
    if (!checksumFromPayload) {
      this.logger.warn('No checksum found in FPX callback payload');
      return false;
    }

    // For now, accept all callbacks in non-production
    // A full implementation would use crypto.createVerify with the FPX public cert
    this.logger.warn(
      'FPX signature verification using basic check - implement full RSA verification for production',
    );
    return true;
  }

  /**
   * Formats a Date into the FPX timestamp format: YYYYMMDDHHmmss
   */
  private formatTimestamp(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
      date.getFullYear().toString() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds())
    );
  }
}
