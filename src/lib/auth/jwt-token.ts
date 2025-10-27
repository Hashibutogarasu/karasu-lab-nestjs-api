import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { RoleSchema } from '../../generated/zod';

export const jwtPayloadSchema = z.object({
  jti: z.string(),
  sub: z.string(),
  provider: z.string().optional(),
  aud: z.string().optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export class JWTPayload extends createZodDto(jwtPayloadSchema) {}

export const createTokenRequestSchema = z.object({
  userId: z.string().uuid(),
  provider: z.string().optional(),
  expirationHours: z.number().optional(),
  jwtStateId: z.string().uuid().optional(),
});

export class CreateTokenRequest extends createZodDto(
  createTokenRequestSchema,
) {}

export const jwtTokenProfileSchema = z.object({
  sub: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  provider: z.string().optional(),
  providers: z.array(z.string()),
});

export const createTokenResponseSchema = z.object({
  success: z.boolean(),
  jwtId: z.string().uuid().optional(),
  token: z.string().optional(),
  profile: jwtTokenProfileSchema.optional(),
  user: z
    .object({
      roles: z.array(RoleSchema),
    })
    .optional(),
  expiresAt: z.date().optional(),
  error: z.string().optional(),
  errorDescription: z.string().optional(),
});

export class CreateTokenResponse extends createZodDto(
  createTokenResponseSchema,
) {}

export const verifyTokenResponseSchema = z.object({
  success: z.boolean(),
  payload: jwtPayloadSchema.optional(),
  error: z.string().optional(),
  errorDescription: z.string().optional(),
});

export class VerifyTokenResponse extends createZodDto(
  verifyTokenResponseSchema,
) {}
