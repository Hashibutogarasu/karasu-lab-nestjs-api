import { createZodDto } from "nestjs-zod";
import z from "zod";

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export class ForgotPasswordDto extends createZodDto(forgotPasswordSchema) { }

export const resetPasswordSchema = z.object({
  oldPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

export class ResetPasswordDto extends createZodDto(resetPasswordSchema) { }


export const confirmResetPasswordSchema = z.object({
  resetCode: z.string().length(6),
  newPassword: z.string().min(8),
});

export class ConfirmResetPasswordDto extends createZodDto(confirmResetPasswordSchema) { }

export const getUserProfileSchema = z.object({
  userId: z.string().uuid(),
});

export class GetUserProfileDto extends createZodDto(getUserProfileSchema) { }

export const setPasswordSchema = z.object({
  newPassword: z.string().min(8),
});

export class SetPasswordDto extends createZodDto(setPasswordSchema) { }
