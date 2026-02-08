import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';

export interface PortalJwtPayload {
  sub: string;
  email: string;
  contactId: string;
  organizationId: string;
  scope: 'portal';
  iat: number;
  exp: number;
}

@Injectable()
export class PortalJwtStrategy extends PassportStrategy(Strategy, 'portal-jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_PORTAL_SECRET', configService.get('JWT_SECRET') + '-portal'),
    });
  }

  async validate(payload: PortalJwtPayload) {
    if (payload.scope !== 'portal') {
      throw new UnauthorizedException('Invalid token scope');
    }

    const portalUser = await this.prisma.portalUser.findUnique({
      where: { id: payload.sub },
      include: {
        contact: {
          select: {
            id: true,
            displayName: true,
            companyName: true,
            email: true,
            phone: true,
            type: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (!portalUser || !portalUser.isActive) {
      throw new UnauthorizedException('Portal user not found or inactive');
    }

    if (portalUser.organization.status !== 'ACTIVE') {
      throw new UnauthorizedException('Organization is inactive');
    }

    return {
      id: portalUser.id,
      email: portalUser.email,
      contactId: portalUser.contactId,
      organizationId: portalUser.organizationId,
      contact: portalUser.contact,
      organization: portalUser.organization,
    };
  }
}
