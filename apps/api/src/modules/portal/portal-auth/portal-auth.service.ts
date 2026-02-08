import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/prisma/prisma.service';
import { PortalLoginDto } from './dto/portal-login.dto';
import { PortalRegisterDto } from './dto/portal-register.dto';

@Injectable()
export class PortalAuthService {
  private readonly logger = new Logger(PortalAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: PortalLoginDto) {
    // Find organization by slug
    const organization = await this.prisma.organization.findUnique({
      where: { slug: dto.organizationSlug },
    });

    if (!organization || organization.status !== 'ACTIVE') {
      throw new UnauthorizedException('Organization not found or inactive');
    }

    // Find portal user
    const portalUser = await this.prisma.portalUser.findUnique({
      where: {
        email_organizationId: {
          email: dto.email,
          organizationId: organization.id,
        },
      },
      include: {
        contact: {
          select: {
            id: true,
            displayName: true,
            companyName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!portalUser || !portalUser.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(dto.password, portalUser.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.portalUser.update({
      where: { id: portalUser.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate portal token
    const tokens = this.generatePortalTokens(portalUser);

    this.logger.log(`Portal user logged in: ${portalUser.email} (org: ${dto.organizationSlug})`);

    return {
      ...tokens,
      user: {
        id: portalUser.id,
        email: portalUser.email,
        contactId: portalUser.contactId,
        organizationId: portalUser.organizationId,
        contact: portalUser.contact,
      },
    };
  }

  async register(dto: PortalRegisterDto) {
    // Validate organization
    const organization = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
    });

    if (!organization || organization.status !== 'ACTIVE') {
      throw new NotFoundException('Organization not found or inactive');
    }

    // Validate contact exists and belongs to this org
    const contact = await this.prisma.contact.findFirst({
      where: {
        id: dto.contactId,
        organizationId: dto.organizationId,
        type: { in: ['CUSTOMER', 'BOTH'] },
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found in this organization');
    }

    // Check if portal user already exists
    const existing = await this.prisma.portalUser.findUnique({
      where: {
        email_organizationId: {
          email: dto.email,
          organizationId: dto.organizationId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('A portal account already exists with this email for this organization');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create portal user
    const portalUser = await this.prisma.portalUser.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        contactId: dto.contactId,
        organizationId: dto.organizationId,
      },
      include: {
        contact: {
          select: {
            id: true,
            displayName: true,
            companyName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Generate tokens
    const tokens = this.generatePortalTokens(portalUser);

    this.logger.log(`Portal user registered: ${portalUser.email} (org: ${organization.slug})`);

    return {
      ...tokens,
      user: {
        id: portalUser.id,
        email: portalUser.email,
        contactId: portalUser.contactId,
        organizationId: portalUser.organizationId,
        contact: portalUser.contact,
      },
    };
  }

  async getProfile(portalUserId: string) {
    const portalUser = await this.prisma.portalUser.findUnique({
      where: { id: portalUserId },
      include: {
        contact: {
          select: {
            id: true,
            displayName: true,
            companyName: true,
            email: true,
            phone: true,
            mobile: true,
            billingAddress: true,
            shippingAddress: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!portalUser) {
      throw new NotFoundException('Portal user not found');
    }

    return {
      id: portalUser.id,
      email: portalUser.email,
      contactId: portalUser.contactId,
      organizationId: portalUser.organizationId,
      lastLoginAt: portalUser.lastLoginAt,
      contact: portalUser.contact,
      organization: portalUser.organization,
    };
  }

  private generatePortalTokens(portalUser: {
    id: string;
    email: string;
    contactId: string;
    organizationId: string;
  }) {
    const secret = this.configService.get(
      'JWT_PORTAL_SECRET',
      this.configService.get('JWT_SECRET') + '-portal',
    );

    const payload = {
      sub: portalUser.id,
      email: portalUser.email,
      contactId: portalUser.contactId,
      organizationId: portalUser.organizationId,
      scope: 'portal',
    };

    const accessToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: this.configService.get('JWT_PORTAL_EXPIRES_IN', '1h'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get('JWT_PORTAL_EXPIRES_IN', '1h'),
    };
  }
}
