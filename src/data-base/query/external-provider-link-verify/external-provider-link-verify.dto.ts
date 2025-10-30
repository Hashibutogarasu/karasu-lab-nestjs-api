import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const createExternalProviderLinkVerifySchema = z.object({
  userId: z.string(),
  provider: z.string(),
  rawExternalProviderProfile: z.any(),
  expiresInMinutes: z.number().int().positive().optional(),
});

export class CreateExternalProviderLinkVerifyDto extends createZodDto(
  createExternalProviderLinkVerifySchema,
) { }

export const verifyExternalProviderLinkVerifySchema = z.object({
  userId: z.string(),
  provider: z.string(),
  verifyCode: z.string(),
});

export class VerifyExternalProviderLinkVerifyDto extends createZodDto(
  verifyExternalProviderLinkVerifySchema,
) { }

export const deleteExternalProviderLinkVerifySchema = z.object({
  id: z.string(),
});

export class DeleteExternalProviderLinkVerifyDto extends createZodDto(
  deleteExternalProviderLinkVerifySchema,
) { }

export const externalProviderLinkVerifyResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  provider: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
});

export class ExternalProviderLinkVerifyResponseDto extends createZodDto(
  externalProviderLinkVerifyResponseSchema,
) { }
