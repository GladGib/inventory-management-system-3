import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { EInvoiceService } from './einvoice.service';
import {
  SubmitEInvoiceDto,
  SubmitBulkEInvoiceDto,
  CancelEInvoiceDto as LegacyCancelDto,
} from './dto/einvoice.dto';
import { UpdateEInvoiceSettingsDto } from './dto/update-einvoice-settings.dto';
import { SubmitSingleEInvoiceDto, SubmitBatchEInvoiceDto } from './dto/submit-einvoice.dto';
import { CancelEInvoiceDto } from './dto/cancel-einvoice.dto';
import { ValidateTinDto } from './dto/validate-tin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('e-Invoice (MyInvois)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('einvoice')
export class EInvoiceController {
  constructor(private readonly einvoiceService: EInvoiceService) {}

  // ============ Settings ============

  @Get('settings')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get e-Invoice settings' })
  @ApiResponse({ status: 200, description: 'e-Invoice settings' })
  async getSettings(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.einvoiceService.getSettings(organizationId);
  }

  @Put('settings')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update e-Invoice settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateSettings(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateEInvoiceSettingsDto,
  ) {
    return this.einvoiceService.updateSettings(organizationId, dto);
  }

  // ============ Connection Test ============

  @Post('test-connection')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Test MyInvois API connection' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testConnection(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.einvoiceService.testConnection(organizationId);
  }

  // ============ Submission ============

  @Post('submit/:invoiceId')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Submit single invoice to MyInvois' })
  @ApiResponse({ status: 201, description: 'e-Invoice submitted' })
  async submitInvoice(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.einvoiceService.submitInvoice(invoiceId, organizationId);
  }

  @Post('submit-batch')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Submit multiple invoices to MyInvois' })
  @ApiResponse({ status: 201, description: 'Batch e-Invoices submitted' })
  async submitBatch(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: SubmitBatchEInvoiceDto,
  ) {
    return this.einvoiceService.submitBatch(dto.invoiceIds, organizationId);
  }

  // ============ Status ============

  @Get('status/:invoiceId')
  @ApiOperation({ summary: 'Get e-Invoice submission status' })
  @ApiResponse({ status: 200, description: 'Submission status' })
  async getSubmissionStatus(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.einvoiceService.getSubmissionStatus(invoiceId, organizationId);
  }

  // ============ Cancellation ============

  @Post('cancel/:invoiceId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Cancel e-Invoice (within 72-hour window)' })
  @ApiResponse({ status: 200, description: 'Cancellation submitted' })
  async cancelInvoice(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CancelEInvoiceDto,
  ) {
    return this.einvoiceService.cancelInvoice(
      invoiceId,
      organizationId,
      dto.reason,
    );
  }

  // ============ QR Code ============

  @Get('qrcode/:invoiceId')
  @ApiOperation({ summary: 'Generate QR code for validated e-Invoice' })
  @ApiResponse({ status: 200, description: 'QR code data URL' })
  async getQRCode(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const qrCode = await this.einvoiceService.generateQRCode(
      invoiceId,
      organizationId,
    );
    return { qrCode };
  }

  // ============ Submissions List ============

  @Get('submissions')
  @ApiOperation({ summary: 'List e-Invoice submissions' })
  @ApiResponse({ status: 200, description: 'Submissions list' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getSubmissions(
    @CurrentUser('organizationId') organizationId: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.einvoiceService.getSubmissions(organizationId, {
      status,
      fromDate,
      toDate,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  // ============ Dashboard ============

  @Get('dashboard')
  @ApiOperation({ summary: 'Get e-Invoice compliance dashboard stats' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  async getDashboard(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.einvoiceService.getComplianceDashboard(organizationId);
  }

  // ============ TIN Validation ============

  @Post('validate-tin')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Validate a TIN number with LHDN' })
  @ApiResponse({ status: 200, description: 'TIN validation result' })
  async validateTin(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: ValidateTinDto,
  ) {
    return this.einvoiceService.validateTin(
      organizationId,
      dto.tin,
      dto.idType,
      dto.idValue,
    );
  }

  // ============ Legacy Endpoints (backward compat) ============

  @Post('submit')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Submit invoice to MyInvois (legacy)' })
  @ApiResponse({ status: 201, description: 'e-Invoice submitted' })
  async submitInvoiceLegacy(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: SubmitEInvoiceDto,
  ) {
    return this.einvoiceService.submitInvoice(dto.invoiceId, organizationId);
  }

  @Post('submit/bulk')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Submit multiple invoices to MyInvois (legacy)' })
  @ApiResponse({ status: 201, description: 'e-Invoices submitted' })
  async submitBulkInvoicesLegacy(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: SubmitBulkEInvoiceDto,
  ) {
    return this.einvoiceService.submitBatch(dto.invoiceIds, organizationId);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get invoices pending e-Invoice submission' })
  @ApiResponse({ status: 200, description: 'Pending submissions' })
  async getPendingSubmissions(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.einvoiceService.getPendingSubmissions(organizationId);
  }

  @Post('cancel')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Cancel e-Invoice submission (legacy)' })
  @ApiResponse({ status: 200, description: 'Cancellation submitted' })
  async cancelSubmissionLegacy(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: LegacyCancelDto,
  ) {
    return this.einvoiceService.cancelInvoice(
      dto.invoiceId,
      organizationId,
      dto.reason,
    );
  }

  @Get('report')
  @ApiOperation({ summary: 'Get e-Invoice submission report' })
  @ApiResponse({ status: 200, description: 'Submission report' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getSubmissionReport(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.einvoiceService.getSubmissionReport(
      organizationId,
      new Date(fromDate),
      new Date(toDate),
    );
  }
}
