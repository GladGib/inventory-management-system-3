import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { PaymentGatewayService } from './payment-gateway.service';
import { InitiatePaymentDto } from '../dto/initiate-payment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('Online Payments')
@Controller('payments/online')
export class PaymentGatewayController {
  private readonly logger = new Logger(PaymentGatewayController.name);

  constructor(private readonly paymentGatewayService: PaymentGatewayService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Initiate an online payment for an invoice' })
  @ApiResponse({
    status: 201,
    description: 'Payment initiated, returns redirect URL',
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async initiatePayment(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentGatewayService.initiatePayment(
      dto.gateway,
      dto.invoiceId,
      organizationId,
      {
        bankCode: dto.bankCode,
        buyerEmail: dto.buyerEmail,
        buyerName: dto.buyerName,
      },
    );
  }

  @Post('callback/:gateway')
  @Public()
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle payment gateway callback (webhook)' })
  @ApiParam({
    name: 'gateway',
    description: 'Payment gateway identifier (e.g., fpx)',
  })
  @ApiResponse({ status: 200, description: 'Callback processed' })
  async handleCallback(
    @Param('gateway') gateway: string,
    @Body() payload: Record<string, any>,
    @Headers('x-signature') signature: string,
    @Req() req: Request,
  ) {
    this.logger.log(`Received ${gateway} callback`);

    // Extract signature from gateway-specific headers or payload fields
    // FPX: fpx_checkSum in payload
    // DuitNow: x-duitnow-signature header or signature in payload
    // GrabPay: x-grabpay-signature or x-grab-signature header
    // TNG: x-tng-signature or signature in payload
    const effectiveSignature =
      signature ||
      req.headers['x-duitnow-signature'] as string ||
      req.headers['x-grabpay-signature'] as string ||
      req.headers['x-grab-signature'] as string ||
      req.headers['x-tng-signature'] as string ||
      payload?.fpx_checkSum ||
      payload?.signature ||
      '';

    return this.paymentGatewayService.handleCallback(
      gateway,
      payload,
      effectiveSignature,
    );
  }

  @Get(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Check online payment status' })
  @ApiResponse({ status: 200, description: 'Payment status' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async checkPaymentStatus(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.paymentGatewayService.checkPaymentStatus(id, organizationId);
  }

  @Get('banks/:gateway')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get available bank list for a payment gateway' })
  @ApiResponse({ status: 200, description: 'List of available banks' })
  async getBankList(@Param('gateway') gateway: string) {
    return this.paymentGatewayService.getBankList(gateway);
  }
}
