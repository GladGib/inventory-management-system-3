import {
  Controller,
  Get,
  Post,
  Put,
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
import { SalesReturnsService } from './sales-returns.service';
import {
  CreateSalesReturnDto,
  UpdateSalesReturnDto,
  ApplyCreditNoteDto,
} from './dto/sales-return.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Sales Returns')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales/returns')
export class SalesReturnsController {
  constructor(private readonly salesReturnsService: SalesReturnsService) {}

  // ============ Sales Returns ============

  @Post()
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create sales return' })
  @ApiResponse({ status: 201, description: 'Return created' })
  async createSalesReturn(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSalesReturnDto
  ) {
    return this.salesReturnsService.createSalesReturn(organizationId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List sales returns' })
  @ApiResponse({ status: 200, description: 'List of returns' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getSalesReturns(
    @CurrentUser('organizationId') organizationId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.salesReturnsService.getSalesReturns(organizationId, {
      status,
      customerId,
      fromDate,
      toDate,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sales return by ID' })
  @ApiResponse({ status: 200, description: 'Return details' })
  async getSalesReturn(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.salesReturnsService.getSalesReturn(id, organizationId);
  }

  @Put(':id')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Update sales return' })
  @ApiResponse({ status: 200, description: 'Return updated' })
  async updateSalesReturn(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateSalesReturnDto
  ) {
    return this.salesReturnsService.updateSalesReturn(id, organizationId, dto);
  }

  @Put(':id/approve')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Approve sales return' })
  @ApiResponse({ status: 200, description: 'Return approved' })
  async approveSalesReturn(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.salesReturnsService.approveSalesReturn(id, organizationId, userId);
  }

  @Put(':id/receive')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Receive returned items' })
  @ApiResponse({ status: 200, description: 'Items received' })
  async receiveSalesReturn(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.salesReturnsService.receiveSalesReturn(id, organizationId, userId);
  }

  @Put(':id/process')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Process return and generate credit note' })
  @ApiResponse({ status: 200, description: 'Return processed' })
  async processSalesReturn(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.salesReturnsService.processSalesReturn(id, organizationId, userId);
  }

  @Put(':id/reject')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Reject sales return' })
  @ApiResponse({ status: 200, description: 'Return rejected' })
  async rejectSalesReturn(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.salesReturnsService.rejectSalesReturn(id, organizationId, userId);
  }

  // ============ Credit Notes ============

  @Get('credit-notes')
  @ApiOperation({ summary: 'List credit notes' })
  @ApiResponse({ status: 200, description: 'List of credit notes' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getCreditNotes(
    @CurrentUser('organizationId') organizationId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.salesReturnsService.getCreditNotes(organizationId, {
      status,
      customerId,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('credit-notes/:id')
  @ApiOperation({ summary: 'Get credit note by ID' })
  @ApiResponse({ status: 200, description: 'Credit note details' })
  async getCreditNote(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.salesReturnsService.getCreditNote(id, organizationId);
  }

  @Post('credit-notes/:id/apply')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Apply credit note to invoices' })
  @ApiResponse({ status: 200, description: 'Credit applied' })
  async applyCreditNote(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ApplyCreditNoteDto
  ) {
    return this.salesReturnsService.applyCreditNote(id, organizationId, userId, dto.applications);
  }
}
