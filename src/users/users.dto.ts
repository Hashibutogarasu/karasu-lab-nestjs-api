import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { publicUserSchema } from '../auth/decorators/auth-user.decorator';
import { extraProfileSchema } from '../data-base/query/extra-profile/extra-profile.dto';

export const usersMeResponseSchema = publicUserSchema.extend({
  extraProfiles: z.array(extraProfileSchema).optional().nullable().default([]),
});

export class UsersMeResponseDto extends createZodDto(usersMeResponseSchema) {}

export const getRolesResponseSchema = z.object({
  roles: z.array(z.string()),
});

export class GetRolesResponseDto extends createZodDto(getRolesResponseSchema) {}
