import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { FpxProvider } from './fpx/fpx.provider';
import { DuitNowProvider } from './duitnow/duitnow.provider';
import { GrabPayProvider } from './grabpay/grabpay.provider';
import { TngProvider } from './tng/tng.provider';
import {
  PaymentGatewayProvider,
  PaymentCallbackResult,
  BankInfo,
} from './payment-gateway.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);
  private readonly providers: Map<string, PaymentGatewayProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly fpxProvider: FpxProvider,
    private readonly duitNowProvider: DuitNowProvider,
    private readonly grabPayProvider: GrabPayProvider,
    private readonly tngProvider: TngProvider,
  ) {
    this.providers = new Map<string, PaymentGatewayProvider>();
    this.providers.set('FPX', this.fpxProvider);
    this.providers.set('DUITNOW', this.duitNowProvider);
    this.providers.set('GRABPAY', this.grabPayProvider);
    this.providers.set('TNG', this.tngProvider);
  }

  /**
   * Initiates an online payment for an invoice.
   *
   * Creates an OnlinePayment record in the database and calls the
   * appropriate gateway provider to generate a payment URL.
   */
  async initiatePayment(
    gateway: string,
    invoiceId: string,
    organizationId: string,
    options: {
      bankCode?: string;
      buyerEmail?: string;
      buyerName?: string;
    } = {},
  ) {
    // Validate gateway
    const provider = this.providers.get(gateway);
    if (!provider) {
      throw new BadRequestException(
        `Payment gateway "${gateway}" is not supported`,
      );
    }

    // Fetch the invoice
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId,
      },
      include: {
        customer: true,
        organization: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Validate invoice status
    if (invoice.status === 'VOID') {
      throw new BadRequestException('Cannot pay a voided invoice');
    }

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Invoice is already fully paid');
    }

    const balance = Number(invoice.balance);
    if (balance <= 0) {
      throw new BadRequestException('Invoice has no outstanding balance');
    }

    // Generate unique reference number
    const referenceNumber = `PAY-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Create the online payment record
    const onlinePayment = await this.prisma.onlinePayment.create({
      data: {
        gateway: gateway as any,
        status: 'PENDING',
        amount: balance,
        currency: 'MYR',
        referenceNumber,
        bankCode: options.bankCode,
        buyerEmail: options.buyerEmail || invoice.customer.email || undefined,
        buyerName: options.buyerName || invoice.customer.displayName,
        description: `Payment for Invoice ${invoice.invoiceNumber}`,
        invoiceId: invoice.id,
        organizationId,
      },
    });

    // Build callback and redirect URLs
    const baseUrl = this.configService.get<string>(
      'APP_BASE_URL',
      'http://localhost:3001',
    );
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    const callbackUrl = `${baseUrl}/api/v1/payments/online/callback/${gateway.toLowerCase()}`;
    const redirectUrl = `${frontendUrl}/sales/invoices/${invoiceId}/pay?status=redirect&ref=${referenceNumber}`;

    try {
      // Call the gateway provider
      const result = await provider.createPayment({
        amount: balance,
        currency: 'MYR',
        referenceNumber,
        description: `Payment for Invoice ${invoice.invoiceNumber}`,
        buyerEmail: options.buyerEmail || invoice.customer.email || undefined,
        buyerName: options.buyerName || invoice.customer.displayName,
        bankCode: options.bankCode,
        callbackUrl,
        redirectUrl,
      });

      // Update payment record with gateway transaction ID
      await this.prisma.onlinePayment.update({
        where: { id: onlinePayment.id },
        data: {
          gatewayRef: result.transactionId,
          status: 'PROCESSING',
        },
      });

      this.logger.log(
        `Payment initiated: ${referenceNumber} via ${gateway} for invoice ${invoice.invoiceNumber}`,
      );

      return {
        paymentId: onlinePayment.id,
        referenceNumber,
        paymentUrl: result.paymentUrl,
        amount: balance,
        gateway,
      };
    } catch (error) {
      // Mark payment as failed
      await this.prisma.onlinePayment.update({
        where: { id: onlinePayment.id },
        data: {
          status: 'FAILED',
          errorMessage:
            error instanceof Error ? error.message : 'Payment initiation failed',
        },
      });
      throw error;
    }
  }

  /**
   * Handles callback from the payment gateway.
   *
   * Verifies the callback signature, updates the OnlinePayment record,
   * and if successful, records a Payment against the linked invoice.
   */
  async handleCallback(
    gateway: string,
    payload: Record<string, any>,
    signature: string,
  ) {
    const provider = this.providers.get(gateway.toUpperCase());
    if (!provider) {
      this.logger.warn(`Callback received for unknown gateway: ${gateway}`);
      throw new BadRequestException(`Unknown gateway: ${gateway}`);
    }

    let callbackResult: PaymentCallbackResult;
    try {
      callbackResult = await provider.verifyCallback(payload, signature);
    } catch (error) {
      this.logger.error(`Failed to verify ${gateway} callback`, error);
      throw new BadRequestException('Callback verification failed');
    }

    // Find the online payment record
    const onlinePayment = await this.prisma.onlinePayment.findUnique({
      where: { referenceNumber: callbackResult.referenceNumber },
      include: {
        invoice: true,
      },
    });

    if (!onlinePayment) {
      this.logger.warn(
        `Payment not found for reference: ${callbackResult.referenceNumber}`,
      );
      throw new NotFoundException('Payment record not found');
    }

    // Don't process if already completed or failed
    if (['COMPLETED', 'FAILED', 'REFUNDED'].includes(onlinePayment.status)) {
      this.logger.warn(
        `Duplicate callback for payment ${onlinePayment.id} - status: ${onlinePayment.status}`,
      );
      return { status: onlinePayment.status, message: 'Already processed' };
    }

    // Map callback status to our enum
    const statusMap: Record<string, string> = {
      COMPLETED: 'COMPLETED',
      PENDING: 'PROCESSING',
      FAILED: 'FAILED',
      EXPIRED: 'EXPIRED',
    };
    const newStatus =
      statusMap[callbackResult.status] || 'FAILED';

    // Update online payment record
    await this.prisma.onlinePayment.update({
      where: { id: onlinePayment.id },
      data: {
        status: newStatus as any,
        gatewayRef: callbackResult.gatewayRef || onlinePayment.gatewayRef,
        callbackPayload: payload,
        completedAt: newStatus === 'COMPLETED' ? new Date() : undefined,
        errorMessage:
          newStatus === 'FAILED'
            ? `Gateway returned status: ${callbackResult.status}`
            : undefined,
      },
    });

    // If payment was successful, record a Payment against the invoice
    if (newStatus === 'COMPLETED' && onlinePayment.invoiceId) {
      await this.recordSuccessfulPayment(onlinePayment);
    }

    this.logger.log(
      `Callback processed for ${callbackResult.referenceNumber}: ${newStatus}`,
    );

    return {
      status: newStatus,
      referenceNumber: callbackResult.referenceNumber,
    };
  }

  /**
   * Checks the current status of an online payment.
   */
  async checkPaymentStatus(paymentId: string, organizationId: string) {
    const onlinePayment = await this.prisma.onlinePayment.findFirst({
      where: {
        id: paymentId,
        organizationId,
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            balance: true,
            paymentStatus: true,
          },
        },
      },
    });

    if (!onlinePayment) {
      throw new NotFoundException('Online payment not found');
    }

    // Optionally query the gateway for live status if still pending
    if (
      onlinePayment.status === 'PROCESSING' ||
      onlinePayment.status === 'PENDING'
    ) {
      const gateway = onlinePayment.gateway;
      const provider = this.providers.get(gateway);
      if (provider) {
        try {
          const liveStatus = await provider.checkStatus(
            onlinePayment.referenceNumber,
          );
          if (
            liveStatus.status !== 'PENDING' &&
            liveStatus.status !== onlinePayment.status
          ) {
            // Update with live status
            await this.prisma.onlinePayment.update({
              where: { id: onlinePayment.id },
              data: {
                status: liveStatus.status as any,
                gatewayRef: liveStatus.gatewayRef || onlinePayment.gatewayRef,
              },
            });
            onlinePayment.status = liveStatus.status as any;
          }
        } catch (error) {
          this.logger.warn(
            `Failed to check live status for payment ${paymentId}`,
            error,
          );
        }
      }
    }

    return {
      id: onlinePayment.id,
      gateway: onlinePayment.gateway,
      status: onlinePayment.status,
      amount: onlinePayment.amount,
      currency: onlinePayment.currency,
      referenceNumber: onlinePayment.referenceNumber,
      gatewayRef: onlinePayment.gatewayRef,
      invoice: onlinePayment.invoice,
      createdAt: onlinePayment.createdAt,
      completedAt: onlinePayment.completedAt,
      errorMessage: onlinePayment.errorMessage,
    };
  }

  /**
   * Returns the list of available banks for a given gateway.
   */
  async getBankList(gateway: string): Promise<BankInfo[]> {
    const provider = this.providers.get(gateway.toUpperCase());
    if (!provider || !provider.getBankList) {
      throw new BadRequestException(
        `Bank list not available for gateway: ${gateway}`,
      );
    }
    return provider.getBankList();
  }

  /**
   * Records a successful online payment as a Payment + PaymentAllocation
   * against the linked invoice, updating the invoice balance.
   */
  private async recordSuccessfulPayment(
    onlinePayment: {
      id: string;
      amount: any;
      referenceNumber: string;
      invoiceId: string | null;
      organizationId: string;
      gateway: string;
    } & { invoice: any },
  ) {
    if (!onlinePayment.invoiceId || !onlinePayment.invoice) {
      return;
    }

    const amount = Number(onlinePayment.amount);
    const invoice = onlinePayment.invoice;
    const organizationId = onlinePayment.organizationId;

    // Generate payment number
    const paymentCount = await this.prisma.payment.count({
      where: { organizationId },
    });
    const paymentNumber = `PMT-${String(paymentCount + 1).padStart(5, '0')}`;

    // Map gateway to payment method enum
    const gatewayToMethod: Record<string, string> = {
      FPX: 'FPX',
      DUITNOW: 'DUITNOW',
      GRABPAY: 'GRABPAY',
      TNG: 'TNG_EWALLET',
    };
    const paymentMethod =
      gatewayToMethod[onlinePayment.gateway] || 'BANK_TRANSFER';

    await this.prisma.$transaction(async (tx) => {
      // Create Payment record
      const payment = await tx.payment.create({
        data: {
          organizationId,
          paymentNumber,
          customerId: invoice.customerId,
          paymentDate: new Date(),
          amount,
          paymentMethod: paymentMethod as any,
          referenceNumber: onlinePayment.referenceNumber,
          notes: `Online payment via ${onlinePayment.gateway}`,
          status: 'COMPLETED',
          allocations: {
            create: {
              invoiceId: onlinePayment.invoiceId!,
              amount,
            },
          },
        },
      });

      // Update invoice payment status
      const currentAmountPaid = Number(invoice.amountPaid || 0);
      const newAmountPaid = currentAmountPaid + amount;
      const invoiceTotal = Number(invoice.total);
      const newBalance = Math.max(0, invoiceTotal - newAmountPaid);

      let newPaymentStatus: string = 'PARTIALLY_PAID';
      let newInvoiceStatus: string = invoice.status;

      if (newBalance <= 0.01) {
        // Fully paid (with small rounding tolerance)
        newPaymentStatus = 'PAID';
        newInvoiceStatus = 'PAID';
      }

      await tx.invoice.update({
        where: { id: onlinePayment.invoiceId! },
        data: {
          amountPaid: newAmountPaid,
          balance: newBalance,
          paymentStatus: newPaymentStatus as any,
          status: newInvoiceStatus as any,
        },
      });

      this.logger.log(
        `Payment ${paymentNumber} recorded for invoice ${invoice.invoiceNumber}: RM ${amount.toFixed(2)}`,
      );

      return payment;
    });
  }
}
