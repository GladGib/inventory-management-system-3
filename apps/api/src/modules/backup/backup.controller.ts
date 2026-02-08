import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Backup')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('backup')
  @ApiOperation({ summary: 'Create a new backup of organization data' })
  @ApiResponse({ status: 201, description: 'Backup created successfully' })
  async createBackup(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.backupService.createBackup(organizationId);
  }

  @Get('backups')
  @ApiOperation({ summary: 'List available backups for the organization' })
  @ApiResponse({ status: 200, description: 'List of backups' })
  async listBackups(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.backupService.listBackups(organizationId);
  }

  @Post('restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore organization data from a backup file' })
  @ApiResponse({ status: 200, description: 'Backup restored successfully' })
  @ApiResponse({ status: 400, description: 'Invalid backup file' })
  @ApiResponse({ status: 404, description: 'Backup file not found' })
  async restoreBackup(
    @CurrentUser('organizationId') organizationId: string,
    @Body() body: { filename: string },
  ) {
    return this.backupService.restoreBackup(organizationId, body.filename);
  }

  @Delete('backups/:filename')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a backup file' })
  @ApiResponse({ status: 204, description: 'Backup deleted successfully' })
  @ApiResponse({ status: 404, description: 'Backup file not found' })
  async deleteBackup(
    @CurrentUser('organizationId') organizationId: string,
    @Param('filename') filename: string,
  ) {
    return this.backupService.deleteBackup(organizationId, filename);
  }
}
