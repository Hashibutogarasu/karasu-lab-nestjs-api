import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { jwtTokenProfileSchema } from '../../lib/auth/jwt-token';

export const mfaSetupResponseSchema = z.object({
  message: z.string(),
  otpauth: z.string(),
  secret: z.string(),
  backup_codes: z.array(z.string()),
});

export class MfaSetupResponseDto extends createZodDto(mfaSetupResponseSchema) {}

export const mfaGetBackupCodesResponseSchema = z.object({
  message: z.string(),
  backup_codes: z.array(z.string()),
});

export class MfaGetBackupCodesResponseDto extends createZodDto(
  mfaGetBackupCodesResponseSchema,
) {}

export const mfaVerifyDto = z.object({
  mfaToken: z.string(),
  code: z.string(),
});

export class MfaVerifyDto extends createZodDto(mfaVerifyDto) {}

export const mfaVerifyResponseSchema = z.object({
  message: z.string(),
  jwtId: z.string(),
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  refresh_expires_in: z.number(),
  session_id: z.string(),
  profile: jwtTokenProfileSchema.optional(),
});

export class MfaVerifyResponseDto extends createZodDto(
  mfaVerifyResponseSchema,
) {}
