import z from 'zod';
import { commonJwtPayloadSchema } from '../../oauth/oauth.dto';
import { createZodDto } from 'nestjs-zod';

export const verifyTokenResponseSchema = z.object({
  success: z.boolean(),
  payload: commonJwtPayloadSchema.optional(),
  error: z.string().optional(),
  errorDescription: z.string().optional(),
});

export class VerifyTokenResponse extends createZodDto(
  verifyTokenResponseSchema,
) {}
