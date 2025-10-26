import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
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
      return (
        ex &&
        (ex instanceof AppErrorCode)
      );
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

    throw AppErrorCodes.INTERNAL_SERVER_ERROR.setCustomMessage(
      exception.message,
    );
  }
}
