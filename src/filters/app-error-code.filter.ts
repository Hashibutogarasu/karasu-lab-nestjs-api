import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppErrorCode } from '../types/error-codes';

@Catch(AppErrorCode)
export class AppErrorCodeFilter implements ExceptionFilter {
  catch(exception: AppErrorCode, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.isHttpError
      ? (exception.code as number)
      : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      message: exception.message,
      status: status,
      code: exception.key,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
