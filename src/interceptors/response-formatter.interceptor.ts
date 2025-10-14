import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { NO_INTERCEPTOR_KEY } from './no-interceptor.decorator';

@Injectable()
export class ResponseFormatterInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const cls = context.getClass();

    const disabledOnHandler = this.reflector.get<boolean>(
      NO_INTERCEPTOR_KEY,
      handler,
    );
    const disabledOnClass = this.reflector.get<boolean>(
      NO_INTERCEPTOR_KEY,
      cls,
    );

    if (disabledOnHandler || disabledOnClass) {
      return next.handle();
    }

    return next.handle().pipe(
      map((value) => {
        // Avoid double wrapping
        if (
          value &&
          typeof value === 'object' &&
          'success' in value &&
          'data' in value
        ) {
          return value;
        }

        let message = 'OK';
        if (value && typeof value === 'object' && 'message' in value) {
          const { message: msg, ...rest } = value as Record<string, any>;
          message = typeof msg === 'string' ? msg : 'OK';
          return {
            success: true,
            message,
            data: rest,
          };
        }

        return {
          success: true,
          message,
          data: value,
        };
      }),
    );
  }
}
