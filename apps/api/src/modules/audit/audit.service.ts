import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { Prisma } from '@prisma/client';

export interface AuditLogParams {
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  organizationId: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an audit log entry. This method is fire-and-forget by default
   * so it does not block the main request flow.
   */
  async log(params: AuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId || null,
          changes: params.changes ? (params.changes as Prisma.InputJsonValue) : Prisma.JsonNull,
          userId: params.userId || null,
          userEmail: params.userEmail || null,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          organizationId: params.organizationId,
        },
      });
    } catch (error) {
      // Audit logging should never break the main flow
      this.logger.error('Failed to write audit log', error);
    }
  }

  /**
   * Query audit logs with filtering, pagination, and sorting.
   */
  async getAuditLogs(organizationId: string, query: AuditQueryDto) {
    const {
      entityType,
      entityId,
      userId,
      action,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
    } = query;

    const where: Prisma.AuditLogWhereInput = {
      organizationId,
    };

    if (entityType) {
      where.entityType = entityType;
    }

    if (entityId) {
      where.entityId = entityId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        { userEmail: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get distinct entity types that appear in audit logs for a given organization.
   * Useful for populating filter dropdowns.
   */
  async getEntityTypes(organizationId: string): Promise<string[]> {
    const result = await this.prisma.auditLog.findMany({
      where: { organizationId },
      distinct: ['entityType'],
      select: { entityType: true },
      orderBy: { entityType: 'asc' },
    });
    return result.map((r) => r.entityType);
  }

  /**
   * Get distinct actions that appear in audit logs for a given organization.
   */
  async getActions(organizationId: string): Promise<string[]> {
    const result = await this.prisma.auditLog.findMany({
      where: { organizationId },
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    });
    return result.map((r) => r.action);
  }
}
