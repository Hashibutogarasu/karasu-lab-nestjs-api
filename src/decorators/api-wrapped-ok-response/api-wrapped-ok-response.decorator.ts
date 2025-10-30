import { applyDecorators, SetMetadata, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
  ApiProperty,
} from '@nestjs/swagger';

class _ApiWrappedOkDto<T = unknown> {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'OK' })
  message!: string;

  @ApiProperty({
    type: Object as any,
    nullable: true,
    additionalProperties: true,
  })
  data?: T;

  @ApiProperty({ example: 'session-id-12345', required: false })
  sessionId?: string;
}

const META_KEY = 'api-wrapped-ok-response';

export const ApiWrappedOkResponse = (
  meta?: { type?: Type<unknown>; description?: string } | unknown,
) => {
  const decorators: any[] = [SetMetadata(META_KEY, meta)];
  const providedType =
    (meta && typeof meta === 'object' && (meta as any).type) || undefined;

  if (providedType) {
    class _RuntimeApiWrappedOkDto extends _ApiWrappedOkDto<any> {
      @ApiProperty({ type: providedType as any, nullable: true })
      declare data?: any;
    }

    try {
      const typeName = (providedType && (providedType as any).name) || 'Data';
      const uniqueName = `Wrapped${typeName}`;
      Object.defineProperty(_RuntimeApiWrappedOkDto, 'name', {
        value: uniqueName,
      });
    } catch (e) {
      // ignore errors
    }

    decorators.push(
      ApiExtraModels(_RuntimeApiWrappedOkDto, providedType as Type<unknown>),
      ApiOkResponse({
        description: (meta as any).description,
        schema: { $ref: getSchemaPath(_RuntimeApiWrappedOkDto) },
      }),
    );
  } else {
    decorators.push(
      ApiExtraModels(_ApiWrappedOkDto),
      ApiOkResponse({
        description: (meta && (meta as any).description) || undefined,
        schema: { $ref: getSchemaPath(_ApiWrappedOkDto) },
      }),
    );
  }

  return applyDecorators(...decorators);
};

export { META_KEY as API_WRAPPED_OK_RESPONSE_METADATA_KEY };
