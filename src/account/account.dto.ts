import { createZodDto } from "nestjs-zod";
import z from "zod";

const emailChangeRequestSchema = z.object({
  newEmail: z.string().email(),
});

export class EmailChangeRequestDto extends createZodDto(emailChangeRequestSchema) {}

const emailChangeVerifySchema = z.object({
  verificationCode: z.string().length(6),
});

export class EmailChangeVerifyDto extends createZodDto(emailChangeVerifySchema) {}
