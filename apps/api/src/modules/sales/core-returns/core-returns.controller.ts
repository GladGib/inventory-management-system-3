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
import { CoreReturnsService } from './core-returns.service';
import {
  CreateCoreReturnDto,
  ReceiveCoreReturnDto,
  CreditCoreReturnDto,
  RejectCoreReturnDto,
} from './dto/core-return.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Core Returns')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales/core-returns')
export class CoreReturnsController {
  constructor(private readonly coreReturnsService: CoreReturnsService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create core return' })
  @ApiResponse({ status: 201, description: 'Core return created' })
  async createCoreReturn(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCoreReturnDto,
  ) {
    return this.coreReturnsService.createCoreReturn(
      organizationId,
      userId,
      dto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List core returns' })
  @ApiResponse({ status: 200, description: 'List of core returns' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'overdue', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getCoreReturns(
    @CurrentUser('organizationId') organizationId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('overdue') overdue?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.coreReturnsService.getCoreReturns(organizationId, {
      status,
      customerId,
      fromDate,
      toDate,
      overdue,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('overdue-count')
  @ApiOperation({ summary: 'Get overdue core returns count' })
  @ApiResponse({ status: 200, description: 'Overdue count' })
  async getOverdueCount(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const count =
      await this.coreReturnsService.getOverdueCoreReturnsCount(organizationId);
    return { count };
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get pending core returns for a customer' })
  @ApiResponse({ status: 200, description: 'Customer pending core returns' })
  async getCustomerPendingCoreReturns(
    @Param('customerId') customerId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.coreReturnsService.getCustomerPendingCoreReturns(
      customerId,
      organizationId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get core return by ID' })
  @ApiResponse({ status: 200, description: 'Core return details' })
  async getCoreReturn(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.coreReturnsService.getCoreReturn(id, organizationId);
  }

  @Put(':id/receive')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Mark core as received from customer' })
  @ApiResponse({ status: 200, description: 'Core return marked as received' })
  async receiveCoreReturn(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto?: ReceiveCoreReturnDto,
  ) {
    return this.coreReturnsService.receiveCoreReturn(
      id,
      organizationId,
      userId,
      dto?.notes,
    );
  }

  @Put(':id/credit')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Issue credit for returned core' })
  @ApiResponse({ status: 200, description: 'Core return credited' })
  async creditCoreReturn(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto?: CreditCoreReturnDto,
  ) {
    return this.coreReturnsService.creditCoreReturn(
      id,
      organizationId,
      userId,
      dto?.notes,
    );
  }

  @Put(':id/reject')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Reject returned core' })
  @ApiResponse({ status: 200, description: 'Core return rejected' })
  async rejectCoreReturn(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto?: RejectCoreReturnDto,
  ) {
    return this.coreReturnsService.rejectCoreReturn(
      id,
      organizationId,
      userId,
      dto?.notes,
    );
  }
}
