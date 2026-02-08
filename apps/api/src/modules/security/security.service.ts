import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Returns CORS configuration suitable for the environment.
   */
  getCorsConfig() {
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    const isProduction = this.config.get('NODE_ENV') === 'production';

    return {
      origin: isProduction ? frontendUrl : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['Content-Disposition'],
      maxAge: 86400, // 24 hours preflight cache
    };
  }

  /**
   * Returns Helmet security headers configuration.
   */
  getHelmetConfig() {
    return {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'none'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Disable for API
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
    };
  }

  /**
   * Simple in-memory rate limiter check.
   * For production, use Redis-backed rate limiting (e.g., @nestjs/throttler with Redis store).
   */
  private rateLimitStore = new Map<string, { count: number; resetAt: number }>();

  async checkRateLimit(
    userId: string,
    action: string,
    maxAttempts = 10,
    windowMs = 60000,
  ): Promise<boolean> {
    const key = `${userId}:${action}`;
    const now = Date.now();

    const entry = this.rateLimitStore.get(key);
    if (!entry || now > entry.resetAt) {
      this.rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (entry.count >= maxAttempts) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Validate password against security policy.
   */
  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Minimum 8 characters required');
    }
    if (password.length > 128) {
      errors.push('Maximum 128 characters allowed');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('At least one uppercase letter required');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('At least one lowercase letter required');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('At least one number required');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('At least one special character required');
    }

    // Common password check
    const commonPasswords = [
      'password', 'password1', '12345678', 'qwerty123',
      'admin123', 'letmein', 'welcome1',
    ];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('This password is too common');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Invalidate all refresh tokens for a given user,
   * effectively logging them out of all sessions.
   */
  async invalidateAllSessions(userId: string): Promise<void> {
    const deleted = await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
    this.logger.log(`Invalidated ${deleted.count} sessions for user ${userId}`);
  }

  /**
   * Invalidate all refresh tokens for all users in an organization.
   */
  async invalidateOrganizationSessions(organizationId: string): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    const deleted = await this.prisma.refreshToken.deleteMany({
      where: { userId: { in: userIds } },
    });
    this.logger.log(
      `Invalidated ${deleted.count} sessions for organization ${organizationId}`,
    );
  }

  /**
   * Clean up expired refresh tokens.
   * Can be called periodically (e.g., via cron) to keep the database tidy.
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    this.logger.log(`Cleaned up ${result.count} expired refresh tokens`);
    return result.count;
  }
}
