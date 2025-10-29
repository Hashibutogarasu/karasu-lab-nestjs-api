import { applyDecorators, SetMetadata, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
  ApiProperty,
} from '@nestjs/swagger';

// Minimal wrapper DTO used only for Swagger schema generation
class _ApiWrappedOkDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'OK' })
  message!: string;

  // `data` will be replaced by an allOf merge with the concrete type when provided
  @ApiProperty({ type: Object as any, nullable: true, additionalProperties: true })
  data?: unknown;
}

const META_KEY = 'api-wrapped-ok-response';

export const ApiWrappedOkResponse = (meta?: { type?: Type<unknown>; description?: string } | unknown) => {
  const decorators: any[] = [SetMetadata(META_KEY, meta)];

  // If caller provided a `type`, register it and produce a composed schema for Swagger
  const providedType = (meta && typeof meta === 'object' && (meta as any).type) || undefined;

  if (providedType) {
    decorators.push(
      ApiExtraModels(_ApiWrappedOkDto, providedType as Type<unknown>),
      ApiOkResponse({
        description: (meta as any).description,
        schema: {
          allOf: [
            { $ref: getSchemaPath(_ApiWrappedOkDto) },
            {
              properties: {
                data: { $ref: getSchemaPath(providedType as Type<unknown>) },
              },
            },
          ],
        },
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
