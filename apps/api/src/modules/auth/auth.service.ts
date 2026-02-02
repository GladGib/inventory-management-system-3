import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokensDto } from './dto/tokens.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto): Promise<TokensDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is inactive');
    }

    return this.generateTokens(user);
  }

  async register(registerDto: RegisterDto) {
    // Check if email already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    // Create organization
    const organization = await this.prisma.organization.create({
      data: {
        name: registerDto.organizationName,
        slug: this.generateSlug(registerDto.organizationName),
        industry: registerDto.industry || 'AUTO_PARTS',
        email: registerDto.email,
      },
    });

    // Create default warehouse
    await this.prisma.warehouse.create({
      data: {
        organizationId: organization.id,
        name: 'Main Warehouse',
        code: 'MAIN',
        isDefault: true,
      },
    });

    // Create default tax rates for Malaysia
    await this.createDefaultTaxRates(organization.id);

    // Create default payment terms
    await this.createDefaultPaymentTerms(organization.id);

    // Create user as admin of the organization
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        name: registerDto.name,
        phone: registerDto.phone,
        role: 'ADMIN',
        organizationId: organization.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    this.logger.log(`New organization registered: ${organization.name} (${organization.slug})`);

    return {
      user,
      ...await this.generateTokens(user),
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokensDto> {
    // Verify refresh token exists and is valid
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: storedToken.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        status: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Delete old refresh token
    await this.prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    return this.generateTokens(user);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // Delete specific refresh token
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId,
          token: refreshToken,
        },
      });
    } else {
      // Delete all refresh tokens for user
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }

    return { message: 'Logged out successfully' };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    role: string;
    organizationId: string;
  }): Promise<TokensDto> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    // Generate access token
    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .concat('-', Date.now().toString(36));
  }

  private async createDefaultTaxRates(organizationId: string) {
    await this.prisma.taxRate.createMany({
      data: [
        {
          organizationId,
          name: 'SST 10%',
          rate: 10,
          type: 'SST',
          description: 'Standard Sales and Service Tax',
          isDefault: true,
        },
        {
          organizationId,
          name: 'Service Tax 6%',
          rate: 6,
          type: 'SERVICE_TAX',
          description: 'Service Tax',
        },
        {
          organizationId,
          name: 'Zero Rated',
          rate: 0,
          type: 'ZERO_RATED',
          description: 'Zero rated supplies',
        },
        {
          organizationId,
          name: 'Exempt',
          rate: 0,
          type: 'EXEMPT',
          description: 'Tax exempt supplies',
        },
      ],
    });
  }

  private async createDefaultPaymentTerms(organizationId: string) {
    await this.prisma.paymentTerm.createMany({
      data: [
        {
          organizationId,
          name: 'Due on Receipt',
          days: 0,
          description: 'Payment due immediately',
        },
        {
          organizationId,
          name: 'Net 7',
          days: 7,
          description: 'Payment due in 7 days',
        },
        {
          organizationId,
          name: 'Net 14',
          days: 14,
          description: 'Payment due in 14 days',
        },
        {
          organizationId,
          name: 'Net 30',
          days: 30,
          description: 'Payment due in 30 days',
          isDefault: true,
        },
        {
          organizationId,
          name: 'Net 60',
          days: 60,
          description: 'Payment due in 60 days',
        },
      ],
    });
  }
}
