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

    if (exception instanceof AppErrorCode) {
      if (exception === AppErrorCodes.DATABASE_CONNECTION_ERROR) {
        process.exit(1);
      }

      const status = exception.isHttpError
        ? (exception.code as number)
        : HttpStatus.INTERNAL_SERVER_ERROR;

      response.status(status).json({
        message: exception.message,
        customMessage: exception.customMessage,
        status: status,
        code: exception.key,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    if (
      exception &&
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      'message' in exception
    ) {
      const ex = exception as any;
      const status = ex.isHttpError
        ? (ex.code as number)
        : HttpStatus.INTERNAL_SERVER_ERROR;
      response.status(status).json({
        message: ex.message,
        customMessage: ex.customMessage,
        status,
        code: ex.key || ex.code || 'ERROR',
        timestamp: new Date().toISOString(),
        path: request.url,
      });

      return;
    }

    throw AppErrorCodes.INTERNAL_SERVER_ERROR.setCustomMesage(
      exception.message,
    );
  }
}
