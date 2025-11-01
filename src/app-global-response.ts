import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const baseResponseSchema = z.object({
  success: z.boolean().default(true),
  message: z.string().optional().default('OK'),
  sessionId: z.string().optional(),
  rawMessage: z.string().optional(),
  data: z.any().optional(),
});

export const formattedSchema = baseResponseSchema.loose().transform((inputData) => {
  const knownKeys = Object.keys(baseResponseSchema.shape);
  const known: Record<string, unknown> = {};
  const extra: Record<string, unknown> = {};

  for (const key in inputData) {
    if (knownKeys.includes(key)) {
      known[key] = inputData[key];
    } else {
      extra[key] = inputData[key];
    }
  }

  known.data = extra;
  return known;
});

export class AppGlobalResponse extends createZodDto(formattedSchema) { }