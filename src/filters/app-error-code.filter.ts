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

      response.status(status).json({
        message: appError.message,
        customMessage: appError.customMessage,
        status: status,
        code: appError.key,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resp = exception.getResponse();
      const body = typeof resp === 'string' ? { message: resp } : resp;
      response.status(status).json(body as any);
      return;
    }

    const appErr = AppErrorCodes.INTERNAL_SERVER_ERROR;

    response.status(appErr.code).json({
      message: appErr.message,
      customMessage: appErr.customMessage,
      status: appErr.code,
      code: appErr.key,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
