import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

/**
 * Maps HTTP methods to audit action names.
 */
const METHOD_ACTION_MAP: Record<string, string> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

/**
 * Extracts the entity type from a URL path.
 * e.g., /api/v1/items/123 -> Item
 * e.g., /api/v1/sales/orders/456 -> SalesOrder
 */
function extractEntityType(url: string): string {
  // Remove query params and version prefix
  const path = url.split('?')[0].replace(/^\/api\/v\d+\//, '');
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) return 'Unknown';

  // Map common route segments to entity names
  const routeEntityMap: Record<string, string> = {
    items: 'Item',
    contacts: 'Contact',
    invoices: 'Invoice',
    payments: 'Payment',
    categories: 'Category',
    warehouses: 'Warehouse',
    inventory: 'Inventory',
    organizations: 'Organization',
    users: 'User',
    auth: 'Auth',
    quotes: 'Quote',
    bills: 'Bill',
    'tax-rates': 'TaxRate',
    'payment-terms': 'PaymentTerm',
    'price-lists': 'PriceList',
    assemblies: 'Assembly',
    'audit-logs': 'AuditLog',
    backups: 'Backup',
  };

  // Handle nested routes like /sales/orders, /purchases/orders
  if (segments[0] === 'sales') {
    if (segments[1] === 'orders') return 'SalesOrder';
    if (segments[1] === 'returns') return 'SalesReturn';
    return 'Sales';
  }

  if (segments[0] === 'purchases') {
    if (segments[1] === 'orders') return 'PurchaseOrder';
    if (segments[1] === 'receives') return 'PurchaseReceive';
    if (segments[1] === 'bills') return 'Bill';
    return 'Purchase';
  }

  return routeEntityMap[segments[0]] || segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
}

/**
 * Extracts a possible entity ID from URL path segments.
 * Looks for CUID-like or UUID-like segments.
 */
function extractEntityId(url: string): string | undefined {
  const path = url.split('?')[0];
  const segments = path.split('/').filter(Boolean);

  // Look for segments that look like IDs (cuid, uuid, or long alphanumeric)
  for (const segment of segments.reverse()) {
    if (/^[a-z0-9]{20,}$/i.test(segment) || /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(segment)) {
      return segment;
    }
  }

  return undefined;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit mutations (POST, PUT, PATCH, DELETE)
    const action = METHOD_ACTION_MAP[method];
    if (!action) {
      return next.handle();
    }

    // Skip audit log queries and health checks
    const url = request.url || '';
    if (url.includes('audit-logs') || url.includes('health')) {
      return next.handle();
    }

    const user = request.user;
    if (!user?.organizationId) {
      // No authenticated user; skip auditing (e.g., public routes like login/register)
      // We'll handle login/logout explicitly in the auth service
      return next.handle();
    }

    const entityType = extractEntityType(url);
    const entityId = extractEntityId(url);

    return next.handle().pipe(
      tap({
        next: () => {
          // Fire-and-forget: do not await
          this.auditService
            .log({
              action,
              entityType,
              entityId,
              userId: user.sub || user.id,
              userEmail: user.email,
              ipAddress: request.ip || request.connection?.remoteAddress,
              userAgent: request.headers?.['user-agent'],
              organizationId: user.organizationId,
            })
            .catch((err) => {
              this.logger.error('Audit interceptor log failed', err);
            });
        },
        error: () => {
          // Don't log failed requests as audit entries
        },
      }),
    );
  }
}
