import {
  Controller,
  Get,
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
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard overview' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboardOverview(
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.dashboardService.getDashboardOverview(organizationId);
  }

  @Get('sales-trend')
  @ApiOperation({ summary: 'Get sales trend chart data' })
  @ApiResponse({ status: 200, description: 'Sales trend data' })
  @ApiQuery({ name: 'months', required: false, description: 'Number of months (default: 12)' })
  async getSalesTrend(
    @CurrentUser('organizationId') organizationId: string,
    @Query('months') months?: string
  ) {
    return this.dashboardService.getSalesTrend(
      organizationId,
      months ? parseInt(months) : 12
    );
  }

  @Get('top-items')
  @ApiOperation({ summary: 'Get top selling items' })
  @ApiResponse({ status: 200, description: 'Top selling items' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items (default: 10)' })
  async getTopSellingItems(
    @CurrentUser('organizationId') organizationId: string,
    @Query('limit') limit?: string
  ) {
    return this.dashboardService.getTopSellingItems(
      organizationId,
      limit ? parseInt(limit) : 10
    );
  }

  @Get('top-customers')
  @ApiOperation({ summary: 'Get top customers' })
  @ApiResponse({ status: 200, description: 'Top customers' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of customers (default: 10)' })
  async getTopCustomers(
    @CurrentUser('organizationId') organizationId: string,
    @Query('limit') limit?: string
  ) {
    return this.dashboardService.getTopCustomers(
      organizationId,
      limit ? parseInt(limit) : 10
    );
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get dashboard alerts' })
  @ApiResponse({ status: 200, description: 'Dashboard alerts' })
  async getAlerts(
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.dashboardService.getAlerts(organizationId);
  }
}
