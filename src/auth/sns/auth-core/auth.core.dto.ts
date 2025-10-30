import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const externalProviderAuthResultSchema = z.object({
  success: z.boolean(),
  id: z.string().optional(),
  jti: z.string(),
  accessToken: z.string(),
  refreshToken: z.string(),
  userId: z.string(),
  provider: z.string().default('external'),
});

export class ExternalProviderAuthResult extends createZodDto(
  externalProviderAuthResultSchema,
) {}
