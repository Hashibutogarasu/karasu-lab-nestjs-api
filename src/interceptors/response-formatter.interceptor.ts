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
import z from 'zod';
import { createGlobalResponseSchema } from '../app-global-response';

@Injectable()
export class ResponseFormatterInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const cls = context.getClass();

    const req = context.switchToHttp().getRequest();

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

    const globalRespSchema = createGlobalResponseSchema(z.any());

    return next.handle().pipe(
      map((value) => {
        const parseResult = globalRespSchema.safeParse(value);
        if (parseResult.success) return value;

        const defaultMessage = 'OK';

        const msgData = z.object({ message: z.any() }).loose().safeParse(value);
        if (msgData.success) {
          const { message: msg, ...rest } = msgData.data as Record<
            string,
            unknown
          >;
          const message = typeof msg === 'string' ? msg : defaultMessage;
          return {
            success: true,
            message,
            data: rest,
            sessionId: req.sessionId,
          };
        }

        return {
          success: true,
          message: defaultMessage,
          data: value,
          sessionId: req.sessionId,
        };
      }),
    );
  }
}
