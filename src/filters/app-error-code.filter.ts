import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppErrorCode, AppErrorCodes } from '../types/error-codes';

@Catch()
export class AppErrorCodeFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isAppErrorLike = (ex: any): ex is AppErrorCode => {
      return ex && ex instanceof AppErrorCode;
    };

    if (isAppErrorLike(exception)) {
      const appError = exception as AppErrorCode;
      if (exception === AppErrorCodes.DATABASE_CONNECTION_ERROR) {
        process.exit(1);
      }
      const status = appError.isHttpError
        ? (appError.code as number)
        : HttpStatus.INTERNAL_SERVER_ERROR;

      const body = {
        message: appError.message,
        customMessage: appError.customMessage,
        status: status,
        code: appError.key,
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      Promise.resolve(this.postProcessBody(body, appError.name, request, exception))
        .then((processed) => response.status(status).json(processed))
        .catch(() => response.status(status).json(body));

      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resp = exception.getResponse();
      const body = typeof resp === 'string' ? { message: resp } : resp;
      Promise.resolve(this.postProcessBody(body, exception.name, request, exception))
        .then((processed) => response.status(status).json(processed))
        .catch(() => response.status(status).json(body as any));
      return;
    }

    const appErr = AppErrorCodes.INTERNAL_SERVER_ERROR;

    const body = {
      message: appErr.message,
      customMessage: appErr.customMessage,
      status: appErr.code,
      code: appErr.key,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    Promise.resolve(this.postProcessBody(body, appErr.name, request, exception))
      .then((processed) => response.status(appErr.code).json(processed))
      .catch(() => response.status(appErr.code).json(body));
  }

  protected async postProcessBody(body: any, name: string, request: Request, exception: Error) {
    return body;
  }
}
