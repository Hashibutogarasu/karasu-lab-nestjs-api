import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { UserSchema } from '../generated/zod';

const emailChangeRequestSchema = z.object({
  newEmail: z.string().email(),
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
