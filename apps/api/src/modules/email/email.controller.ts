import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { EmailService, SendEmailResult } from './email.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '@/prisma/prisma.service';
import {
  UpdateEmailSettingsDto,
  SendTestEmailDto,
  SendEmailDto,
} from './dto/email.dto';

@ApiTags('Email')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  // ============ Email Settings ============

  @Get('settings/email')
  @ApiOperation({ summary: 'Get email settings' })
  @ApiResponse({ status: 200, description: 'Email settings' })
  async getEmailSettings(@CurrentUser('organizationId') organizationId: string) {
    let settings = await this.prisma.organizationEmailSettings.findUnique({
      where: { organizationId },
    });

    if (!settings) {
      // Return default settings
      return {
        smtpHost: '',
        smtpPort: 587,
        smtpSecure: true,
        smtpUser: '',
        fromName: '',
        fromEmail: '',
        replyTo: '',
        signature: '',
        autoSendInvoice: false,
        autoSendPayment: false,
        autoSendOrder: false,
        autoSendPO: false,
      };
    }

    // Don't return the password
    return {
      ...settings,
      smtpPass: settings.smtpPass ? '********' : '',
    };
  }

  @Put('settings/email')
  @ApiOperation({ summary: 'Update email settings' })
  @ApiResponse({ status: 200, description: 'Email settings updated' })
  @Roles('ADMIN', 'MANAGER')
  async updateEmailSettings(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateEmailSettingsDto,
  ) {
    const existingSettings = await this.prisma.organizationEmailSettings.findUnique({
      where: { organizationId },
    });

    // If password is masked, don't update it
    const smtpPass =
      dto.smtpPass === '********' ? existingSettings?.smtpPass : dto.smtpPass;

    const settings = await this.prisma.organizationEmailSettings.upsert({
      where: { organizationId },
      update: {
        smtpHost: dto.smtpHost,
        smtpPort: dto.smtpPort,
        smtpSecure: dto.smtpSecure,
        smtpUser: dto.smtpUser,
        smtpPass,
        fromName: dto.fromName,
        fromEmail: dto.fromEmail,
        replyTo: dto.replyTo,
        signature: dto.signature,
        autoSendInvoice: dto.autoSendInvoice,
        autoSendPayment: dto.autoSendPayment,
        autoSendOrder: dto.autoSendOrder,
        autoSendPO: dto.autoSendPO,
      },
      create: {
        organizationId,
        smtpHost: dto.smtpHost,
        smtpPort: dto.smtpPort,
        smtpSecure: dto.smtpSecure,
        smtpUser: dto.smtpUser,
        smtpPass,
        fromName: dto.fromName,
        fromEmail: dto.fromEmail,
        replyTo: dto.replyTo,
        signature: dto.signature,
        autoSendInvoice: dto.autoSendInvoice,
        autoSendPayment: dto.autoSendPayment,
        autoSendOrder: dto.autoSendOrder,
        autoSendPO: dto.autoSendPO,
      },
    });

    return {
      ...settings,
      smtpPass: settings.smtpPass ? '********' : '',
    };
  }

  @Post('settings/email/test')
  @ApiOperation({ summary: 'Test email connection' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  @HttpCode(HttpStatus.OK)
  async testEmailConnection(
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<SendEmailResult> {
    return this.emailService.testEmailConnection(organizationId);
  }

  @Post('settings/email/send-test')
  @ApiOperation({ summary: 'Send test email' })
  @ApiResponse({ status: 200, description: 'Test email sent' })
  @HttpCode(HttpStatus.OK)
  async sendTestEmail(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SendTestEmailDto,
  ): Promise<SendEmailResult> {
    return this.emailService.sendTestEmail(organizationId, dto.email, userId);
  }

  // ============ Email Logs ============

  @Get('emails/logs')
  @ApiOperation({ summary: 'Get email logs' })
  @ApiResponse({ status: 200, description: 'Email logs' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getEmailLogs(
    @CurrentUser('organizationId') organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.emailService.getEmailLogs(organizationId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      type,
      status,
    });
  }

  // ============ Send Document Emails ============

  @Post('sales/invoices/:id/send')
  @ApiOperation({ summary: 'Send invoice email' })
  @ApiResponse({ status: 200, description: 'Invoice email sent' })
  @HttpCode(HttpStatus.OK)
  async sendInvoiceEmail(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id') invoiceId: string,
  ): Promise<SendEmailResult> {
    return this.emailService.sendInvoiceEmail(organizationId, invoiceId, userId);
  }

  @Post('sales/payments/:id/send')
  @ApiOperation({ summary: 'Send payment receipt email' })
  @ApiResponse({ status: 200, description: 'Payment receipt email sent' })
  @HttpCode(HttpStatus.OK)
  async sendPaymentReceipt(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id') paymentId: string,
  ) {
    return this.emailService.sendPaymentReceipt(organizationId, paymentId, userId);
  }

  @Post('sales/orders/:id/send')
  @ApiOperation({ summary: 'Send order confirmation email' })
  @ApiResponse({ status: 200, description: 'Order confirmation email sent' })
  @HttpCode(HttpStatus.OK)
  async sendOrderConfirmation(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ) {
    return this.emailService.sendOrderConfirmation(organizationId, orderId, userId);
  }

  @Post('purchases/orders/:id/send')
  @ApiOperation({ summary: 'Send purchase order to vendor' })
  @ApiResponse({ status: 200, description: 'PO email sent to vendor' })
  @HttpCode(HttpStatus.OK)
  async sendPOToVendor(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id') poId: string,
  ) {
    return this.emailService.sendPOToVendor(organizationId, poId, userId);
  }
}
