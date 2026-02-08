import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PortalAuthService } from './portal-auth.service';
import { PortalLoginDto } from './dto/portal-login.dto';
import { PortalRegisterDto } from './dto/portal-register.dto';
import { PortalJwtGuard } from './guards/portal-jwt.guard';

@ApiTags('Portal Auth')
@Controller('portal/auth')
export class PortalAuthController {
  constructor(private readonly portalAuthService: PortalAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Portal user login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: PortalLoginDto) {
    return this.portalAuthService.login(dto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register portal user (invited by org admin)' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: PortalRegisterDto) {
    return this.portalAuthService.register(dto);
  }

  @Get('profile')
  @UseGuards(PortalJwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current portal user profile' })
  @ApiResponse({ status: 200, description: 'Current portal user profile' })
  async getProfile(@Request() req: any) {
    return this.portalAuthService.getProfile(req.user.id);
  }
}
