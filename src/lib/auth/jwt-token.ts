import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const createTokenRequestSchema = z.object({
  userId: z.string().uuid(),
  provider: z.string().optional(),
  expirationHours: z.number().nullable().optional().default(1),
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
  jti: z.cuid(),
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.date(),
  userId: z.string(),
});

export class CreateTokenResponse extends createZodDto(
  createTokenResponseSchema,
) {}
