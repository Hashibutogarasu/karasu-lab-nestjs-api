import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const createSessionSchema = z.object({
  userId: z.cuid(),
  jti: z.string(),
});

export class CreateSessionDto extends createZodDto(createSessionSchema) {}

export const updateSessionSchema = createSessionSchema.partial();

export class UpdateSessionDto extends createZodDto(updateSessionSchema) {}

export const publicSessionSchema = z.object({
  id: z.cuid(),
  userId: z.string(),
  jti: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export class PublicSessionDto extends createZodDto(publicSessionSchema) {}

export const sessionsFindAllRequestSchema = z.object({
  userId: z.string(),
});

export class SessionsFindAllRequestDto extends createZodDto(
  sessionsFindAllRequestSchema,
) {}

export const sessionsFindAllResponseSchema = z.object({
  sessions: z.array(publicSessionSchema),
});

export class SessionsFindAllResponseDto extends createZodDto(
  sessionsFindAllResponseSchema,
) {}

export const sessionsDeleteRequestSchema = z.object({
  id: z.string(),
});

export class SessionsDeleteRequestDto extends createZodDto(
  sessionsDeleteRequestSchema,
) {}
