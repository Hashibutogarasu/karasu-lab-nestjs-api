import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { UserSchema } from '../generated/zod';
import { publicUserSchema } from '../auth/decorators/auth-user.decorator';

const emailChangeRequestSchema = z.object({
  newEmail: z.email(),
});

export class EmailChangeRequestDto extends createZodDto(
  emailChangeRequestSchema,
) { }

const emailChangeVerifySchema = z.object({
  verificationCode: z.string().length(6),
});

export class EmailChangeVerifyDto extends createZodDto(
  emailChangeVerifySchema,
) { }

export const resetPasswordResponseSchema = z.object({
  message: z.string().default('Password updated successfully'),
  user: UserSchema.omit({ passwordHash: true }),
});

export class ResetPasswordResponseDto extends createZodDto(
  resetPasswordResponseSchema,
) { }

export const forgotPasswordResponseSchema = z.object({
  message: z.string(),
});

export class ForgotPasswordResponseDto extends createZodDto(
  forgotPasswordResponseSchema,
) { }

export const confirmResetPasswordResponseSchema = z.object({
  message: z.string(),
  user: UserSchema.partial(),
});

export class ConfirmResetPasswordResponseDto extends createZodDto(
  confirmResetPasswordResponseSchema,
) { }
export class ProfileResponseDto extends createZodDto(publicUserSchema) { }

export const canSetPasswordResponseSchema = z.object({
  canSetPassword: z.boolean(),
  hasPassword: z.boolean(),
  hasExternalProviders: z.boolean(),
});

export class CanSetPasswordResponseDto extends createZodDto(
  canSetPasswordResponseSchema,
) { }

export const unlinkProviderSchema = z.object({
  provider: z.string(),
});

export class UnlinkProviderDto extends createZodDto(unlinkProviderSchema) { }
