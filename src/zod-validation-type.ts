import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ZodError, ZodType } from 'zod';
import { AppErrorCodes } from './types/error-codes';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodType<any>) { }

  transform(value: unknown) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw AppErrorCodes.VALIDATION_FAILED;
      }
      throw error;
    }
  }
}
