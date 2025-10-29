import { PartialType } from '@nestjs/mapped-types';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const createJwtStateSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  revoked: z.boolean().optional(),
});

export class CreateJwtStateDto extends createZodDto(createJwtStateSchema) { }

export class UpdateJwtStateDto extends PartialType(CreateJwtStateDto) { }

export const createJwtStateResponseSchema = createJwtStateSchema.extend({
  jti: z.string(),
  accessToken: z.string(),
  expiresAt: z.number(),
  userId: z.string(),
});

export class CreateJwtStateResponseDto extends createZodDto(
  createJwtStateResponseSchema,
) { }

export const jwtStateFindSchema = z.object({
  id: z.cuid(),
  userId: z.string(),
  revoked: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string().nullable(),
});

export class JwtStateFindDto extends createZodDto(jwtStateFindSchema) { }

export const jwtStateDeleteSchema = z.object({
  id: z.string(),
});

export class JwtStateDeleteDto extends createZodDto(jwtStateDeleteSchema) { }

export const jwtStateFindAllResponseSchema = z.object({
  states: z.array(jwtStateFindSchema),
});

export class JwtStateFindAllResponseDto extends createZodDto(
  jwtStateFindAllResponseSchema,
) { }

export class UpdateJWTStateResponseDto extends createZodDto(jwtStateFindSchema) { }