import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('register-device')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register a device for push notifications' })
  @ApiResponse({ status: 200, description: 'Device registered successfully' })
  async registerDevice(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: RegisterDeviceDto,
  ) {
    const device = await this.notificationsService.registerDevice(
      userId,
      organizationId,
      dto.token,
      dto.platform,
      dto.deviceName,
    );

    return {
      message: 'Device registered successfully',
      deviceId: device.id,
    };
  }

  @Delete('unregister-device')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unregister a device from push notifications' })
  @ApiResponse({
    status: 200,
    description: 'Device unregistered successfully',
  })
  async unregisterDevice(
    @CurrentUser('id') userId: string,
    @Body('token') token: string,
  ) {
    await this.notificationsService.unregisterDevice(userId, token);
    return { message: 'Device unregistered successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'Get notification history' })
  @ApiResponse({ status: 200, description: 'Notification history list' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.getNotificationHistory(
      userId,
      organizationId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
