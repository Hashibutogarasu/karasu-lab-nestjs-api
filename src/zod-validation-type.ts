import { PipeTransform, Injectable } from '@nestjs/common';
import { ZodType } from 'zod';
import { AppErrorCodes } from './types/error-codes';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodType<any>) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw AppErrorCodes.VALIDATION_FAILED;
    }
    return result.data;
  }
}
