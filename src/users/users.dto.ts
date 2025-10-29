import { createZodDto } from "nestjs-zod";
import z from "zod";

export const getRolesResponseSchema = z.object({
  roles: z.array(z.string()),
});

export class GetRolesResponseDto extends createZodDto(getRolesResponseSchema) { }