import { ExecutionContext, CallHandler } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { ConcurrentRequestInterceptor } from './concurrent-request.interceptor';
import { Cache } from '@nestjs/cache-manager';

describe('ConcurrentRequestInterceptor', () => {
  let interceptor: ConcurrentRequestInterceptor;
  let mockCache: Cache;
  let store: Map<string, any>;

  beforeEach(() => {
    store = new Map<string, any>();
    mockCache = {
      get: jest.fn(async (k: string) => store.get(k)),
      set: jest.fn(async <T>(k: string, v: T, ttl?: number): Promise<T> => {
        store.set(k, v);
        if (typeof ttl === 'number') {
          setTimeout(() => store.delete(k), ttl * 100);
        }
        return v;
      }),
      del: jest.fn(async (k: string) => store.delete(k)),
      wrap: jest.fn(),
      mget: jest.fn(async function <T>(
        this: any,
        keys: string[],
      ): Promise<(T | undefined)[]> {
        return keys.map((k) => store.get(k) as T | undefined);
      }) as <T>(keys: string[]) => Promise<(T | undefined)[]>,
      mset: jest.fn(async function <T>(
        list: { key: string; value: T; ttl?: number }[],
      ): Promise<{ key: string; value: T; ttl?: number }[]> {
        list.forEach((item) => {
          store.set(item.key, item.value);
          if (typeof item.ttl === 'number') {
            setTimeout(() => store.delete(item.key), item.ttl * 100);
          }
        });
        return list;
      }) as <T>(
        list: { key: string; value: T; ttl?: number }[],
      ) => Promise<{ key: string; value: T; ttl?: number }[]>,
      mdel: jest.fn(async (keys: string[]) => {
        keys.forEach((k) => store.delete(k));
        return true;
      }),
      ttl: jest.fn(async (k: string) => 15),
      clear: jest.fn(async () => {
        store.clear();
        return true;
      }),
      on: jest.fn(),
      off: jest.fn(),
      disconnect: jest.fn(() => Promise.resolve(undefined)),
      cacheId: () => 'mockCacheId',
      stores: [],
    };

    interceptor = new ConcurrentRequestInterceptor(mockCache);
  });

  function mockContext(userId: string, method = 'POST', path = '/test') {
    const req: any = {
      user: userId ? { id: userId } : undefined,
      method,
      originalUrl: path,
    };

    const context: any = {
      switchToHttp: () => ({ getRequest: () => req }),
    };

    return context as ExecutionContext;
  }

  it('sets lock and deletes it after handler completes', async () => {
    const ctx = mockContext('user1');

    const handler: Partial<CallHandler> = {
      handle: () => of('ok'),
    };

    const result$ = await interceptor.intercept(ctx, handler as CallHandler);
    const val = await firstValueFrom(result$);
    expect(val).toBe('ok');

    const lockKey = 'req-lock:user1:POST:/test';
    expect(mockCache.set).toHaveBeenCalledWith(
      lockKey,
      'locked',
      expect.any(Number),
    );
    expect(mockCache.del).toHaveBeenCalledWith(lockKey);
  });

  it('throws conflict when lock exists for same user/method/path', async () => {
    const ctx = mockContext('user2');

    await mockCache.set('req-lock:user2:POST:/test', 'locked', 15);

    const handler: Partial<CallHandler> = { handle: () => of('ok') };

    await expect(
      interceptor.intercept(ctx, handler as CallHandler),
    ).rejects.toBeDefined();
  });

  it('allows request after TTL expires', async () => {
    jest.useFakeTimers();

    const ctx = mockContext('user3');
    const handler: Partial<CallHandler> = {
      handle: () => {
        return of('done');
      },
    };

    await mockCache.set('req-lock:user3:POST:/test', 'locked', 1);

    jest.advanceTimersByTime(150);

    const result$ = await interceptor.intercept(ctx, handler as CallHandler);
    const val = await firstValueFrom(result$);
    expect(val).toBe('done');

    jest.useRealTimers();
  });
});
