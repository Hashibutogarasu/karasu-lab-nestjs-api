import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { AppErrorCodes } from '../types/error-codes';

@Injectable()
export class ConcurrentRequestInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      return next.handle();
    }

    const method = request.method;
    const path = request.originalUrl;

    const lockKey = `req-lock:${userId}:${method}:${path}`;

    const lockTtl = 15;

    const existing = await this.cacheManager.get(lockKey);
    if (existing) {
      throw AppErrorCodes.CONFLICT;
    }

    await this.cacheManager.set(lockKey, 'locked', lockTtl);

    return next.handle().pipe(
      finalize(() => {
        this.cacheManager.del(lockKey).catch(() => {});
      }),
    );
  }
}
