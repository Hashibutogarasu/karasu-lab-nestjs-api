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
import { formattedSchema } from '../app-global-response';

@Injectable()
export class ResponseFormatterInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) { }

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
        const parseResult = formattedSchema.safeParse(value);
        if (parseResult.success) {
          return parseResult.data;
        }

        return value;
      }),
    );
  }
}
