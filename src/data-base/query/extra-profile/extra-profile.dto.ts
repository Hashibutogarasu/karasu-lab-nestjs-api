import { createZodDto } from "nestjs-zod";
import z from "zod";

export const extraProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  provider: z.string(),
  providerId: z.string(),
  displayName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  rawProfile: z.any(),
  linkingVerified: z.boolean(),
  createdAt: z.union([z.string(), z.any()]),
  updatedAt: z.union([z.string(), z.any()]),
});

export class ExtraProfileDto extends createZodDto(extraProfileSchema) { }