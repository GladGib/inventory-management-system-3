import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@ApiTags('Organizations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current organization' })
  @ApiResponse({ status: 200, description: 'Organization details' })
  async getCurrent(@CurrentUser('organizationId') organizationId: string) {
    return this.organizationsService.findById(organizationId);
  }

  @Put('current')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update current organization' })
  @ApiResponse({ status: 200, description: 'Organization updated' })
  async updateCurrent(
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdateOrganizationDto
  ) {
    return this.organizationsService.update(organizationId, updateDto);
  }

  @Get('current/settings')
  @ApiOperation({ summary: 'Get organization settings' })
  @ApiResponse({ status: 200, description: 'Organization settings' })
  async getSettings(@CurrentUser('organizationId') organizationId: string) {
    return this.organizationsService.getSettings(organizationId);
  }

  @Put('current/settings')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update organization settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateSettings(
    @CurrentUser('organizationId') organizationId: string,
    @Body() settings: Record<string, unknown>
  ) {
    return this.organizationsService.updateSettings(organizationId, settings);
  }

  @Get('current/dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  async getDashboardStats(@CurrentUser('organizationId') organizationId: string) {
    return this.organizationsService.getDashboardStats(organizationId);
  }
}
