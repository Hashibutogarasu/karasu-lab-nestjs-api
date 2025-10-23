import { PartialType } from "@nestjs/mapped-types";
import { createZodDto } from "nestjs-zod";
import z from "zod";

const registerSchema = z.object({
  username: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
});

export class RegisterDto extends createZodDto(registerSchema) {}

const verifyTokenSchema = z.object({
  stateCode: z.string(),
  oneTimeToken: z.string(),
});

export class VerifyTokenDto extends createZodDto(verifyTokenSchema) {}

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export class RefreshTokenDto extends createZodDto(refreshTokenSchema) {}

const authStateSchema = z.object({
  provider: z.string(),
  callbackUrl: z.string().url(),
});

export class AuthStateDto extends createZodDto(authStateSchema) {}

const createAuthSchema = z.object({
  username: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
});

export class CreateAuthDto extends createZodDto(createAuthSchema) {}

const loginSchema = z.object({
  usernameOrEmail: z.string(),
  password: z.string(),
});

export class LoginDto extends createZodDto(loginSchema) {}
export class UpdateAuthDto extends PartialType(CreateAuthDto) {}