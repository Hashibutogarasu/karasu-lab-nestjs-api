import { createZodDto } from 'nestjs-zod';
import z from 'zod';


export const fxConvertCommandSchema = z.object({
  from: z.string().min(1, 'From currency must not be empty'),
  to: z.string().min(1, 'To currency must not be empty'),
  amount: z.number().int().positive().optional(),
});

export class FxConvertCommandDto extends createZodDto(fxConvertCommandSchema) { }