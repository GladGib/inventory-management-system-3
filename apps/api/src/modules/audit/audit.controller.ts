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
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Audit')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List audit logs with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of audit logs' })
  async getAuditLogs(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: AuditQueryDto,
  ) {
    return this.auditService.getAuditLogs(organizationId, query);
  }

  @Get('entity-types')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get distinct entity types in audit logs' })
  @ApiResponse({ status: 200, description: 'List of entity types' })
  async getEntityTypes(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.auditService.getEntityTypes(organizationId);
  }

  @Get('actions')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get distinct actions in audit logs' })
  @ApiResponse({ status: 200, description: 'List of actions' })
  async getActions(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.auditService.getActions(organizationId);
  }
}
