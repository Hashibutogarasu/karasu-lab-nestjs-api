import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const externalProviderAuthResultSchema = z.object({
  jti: z.string(),
  accessToken: z.string(),
  refreshToken: z.string(),
  userId: z.string(),
});

export class ExternalProviderAuthResult extends createZodDto(
  externalProviderAuthResultSchema,
) {}
