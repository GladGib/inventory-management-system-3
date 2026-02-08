import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from './cache.service';

/**
 * HTTP-level cache interceptor for GET requests.
 * Caches responses keyed by URL + organizationId for 60 seconds.
 * Only applies to GET requests; all other methods pass through.
 */
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpCacheInterceptor.name);

  constructor(private readonly cacheService: CacheService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const orgId = request.user?.organizationId || 'anon';
    const key = this.cacheService.buildKey('http', request.url, orgId);

    const cached = await this.cacheService.get(key);
    if (cached) {
      this.logger.debug(`Cache HIT: ${key}`);
      return of(cached);
    }

    this.logger.debug(`Cache MISS: ${key}`);
    return next.handle().pipe(
      tap(async (data) => {
        await this.cacheService.set(key, data, 60); // 60 seconds TTL
      }),
    );
  }
}
