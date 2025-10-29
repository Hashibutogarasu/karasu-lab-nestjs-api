import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const updateUserNameSchema = z.object({
  username: z.string(),
});

export class UpdateUserNameDto extends createZodDto(updateUserNameSchema) { }
