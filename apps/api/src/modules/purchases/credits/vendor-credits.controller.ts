import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { VendorCreditsService } from './vendor-credits.service';
import {
  CreateVendorCreditDto,
  UpdateVendorCreditDto,
  ApplyVendorCreditDto,
} from './dto/vendor-credit.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Vendor Credits')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchases/credits')
export class VendorCreditsController {
  constructor(private readonly vendorCreditsService: VendorCreditsService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create vendor credit' })
  @ApiResponse({ status: 201, description: 'Credit created' })
  async createVendorCredit(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateVendorCreditDto
  ) {
    return this.vendorCreditsService.createVendorCredit(organizationId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List vendor credits' })
  @ApiResponse({ status: 200, description: 'List of credits' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getVendorCredits(
    @CurrentUser('organizationId') organizationId: string,
    @Query('status') status?: string,
    @Query('vendorId') vendorId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.vendorCreditsService.getVendorCredits(organizationId, {
      status,
      vendorId,
      fromDate,
      toDate,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor credit by ID' })
  @ApiResponse({ status: 200, description: 'Credit details' })
  async getVendorCredit(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.vendorCreditsService.getVendorCredit(id, organizationId);
  }

  @Put(':id')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Update vendor credit' })
  @ApiResponse({ status: 200, description: 'Credit updated' })
  async updateVendorCredit(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateVendorCreditDto
  ) {
    return this.vendorCreditsService.updateVendorCredit(id, organizationId, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Delete vendor credit' })
  @ApiResponse({ status: 200, description: 'Credit deleted' })
  async deleteVendorCredit(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.vendorCreditsService.deleteVendorCredit(id, organizationId);
  }

  @Put(':id/void')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Void vendor credit' })
  @ApiResponse({ status: 200, description: 'Credit voided' })
  async voidVendorCredit(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.vendorCreditsService.voidVendorCredit(id, organizationId);
  }

  @Post(':id/apply')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Apply credit to bills' })
  @ApiResponse({ status: 200, description: 'Credit applied' })
  async applyVendorCredit(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ApplyVendorCreditDto
  ) {
    return this.vendorCreditsService.applyVendorCredit(id, organizationId, userId, dto.applications);
  }

  @Get(':id/applications')
  @ApiOperation({ summary: 'Get application history' })
  @ApiResponse({ status: 200, description: 'Application history' })
  async getApplicationHistory(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.vendorCreditsService.getApplicationHistory(id, organizationId);
  }
}
