import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PortalAuthService } from './portal-auth.service';
import { PortalAuthController } from './portal-auth.controller';
import { PortalJwtStrategy } from './strategies/portal-jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_PORTAL_SECRET', configService.get('JWT_SECRET') + '-portal'),
        signOptions: {
          expiresIn: configService.get('JWT_PORTAL_EXPIRES_IN', '1h'),
        },
      }),
    }),
  ],
  controllers: [PortalAuthController],
  providers: [PortalAuthService, PortalJwtStrategy],
  exports: [PortalAuthService, PortalJwtStrategy],
})
export class PortalAuthModule {}
