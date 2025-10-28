import { PartialType } from '@nestjs/mapped-types';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const createJwtStateSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  revoked: z.boolean().optional(),
});

export class CreateJwtStateDto extends createZodDto(createJwtStateSchema) {}

export class UpdateJwtStateDto extends PartialType(CreateJwtStateDto) {}
