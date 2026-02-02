import {
  Controller,
  Get,
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
  CancelEInvoiceDto,
} from './dto/einvoice.dto';
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

  // ============ Submission ============

  @Post('submit')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Submit invoice to MyInvois' })
  @ApiResponse({ status: 201, description: 'e-Invoice submitted' })
  async submitInvoice(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: SubmitEInvoiceDto
  ) {
    return this.einvoiceService.submitInvoice(dto.invoiceId, organizationId);
  }

  @Post('submit/bulk')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Submit multiple invoices to MyInvois' })
  @ApiResponse({ status: 201, description: 'e-Invoices submitted' })
  async submitBulkInvoices(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: SubmitBulkEInvoiceDto
  ) {
    return this.einvoiceService.submitBulkInvoices(dto.invoiceIds, organizationId);
  }

  // ============ Status & Queries ============

  @Get('status/:invoiceId')
  @ApiOperation({ summary: 'Get e-Invoice submission status' })
  @ApiResponse({ status: 200, description: 'Submission status' })
  async getSubmissionStatus(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.einvoiceService.getSubmissionStatus(invoiceId, organizationId);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get invoices pending e-Invoice submission' })
  @ApiResponse({ status: 200, description: 'Pending submissions' })
  async getPendingSubmissions(
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.einvoiceService.getPendingSubmissions(organizationId);
  }

  // ============ Cancellation ============

  @Post('cancel')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Cancel e-Invoice submission' })
  @ApiResponse({ status: 200, description: 'Cancellation submitted' })
  async cancelSubmission(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CancelEInvoiceDto
  ) {
    return this.einvoiceService.cancelSubmission(
      dto.invoiceId,
      organizationId,
      dto.reason
    );
  }

  // ============ Reporting ============

  @Get('report')
  @ApiOperation({ summary: 'Get e-Invoice submission report' })
  @ApiResponse({ status: 200, description: 'Submission report' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  async getSubmissionReport(
    @CurrentUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    return this.einvoiceService.getSubmissionReport(
      organizationId,
      new Date(fromDate),
      new Date(toDate)
    );
  }
}
