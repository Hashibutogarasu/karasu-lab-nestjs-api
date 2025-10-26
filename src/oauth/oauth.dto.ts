import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const oAuthAuthorizeQuerySchema = z.object({
  response_type: z.string(),
  client_id: z.string(),
  redirect_uri: z.url(),
  scope: z.string().optional(),
  state: z.string().optional(),
  code_challenge: z.string().optional(),
  code_challenge_method: z.string().optional(),
});

export class OAuthAuthorizeQuery extends createZodDto(
  oAuthAuthorizeQuerySchema,
) {}

export const oAuthTokenBodySchema = z.object({
  grant_type: z.string(),
  code: z.string(),
  redirect_uri: z.string(),
  client_id: z.string(),
  client_secret: z.string(),
  code_verifier: z.string(),
});

export class OAuthTokenBodyDto extends createZodDto(oAuthTokenBodySchema) {}

export const oAuthTokenRevokeSchema = z.object({
  token: z.string(),
  client_id: z.string(),
  client_secret: z.string(),
});

export const oAuthTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  score: z.string(),
});

export class OAuthTokenResponseDto extends createZodDto(
  oAuthTokenResponseSchema,
) {}

export class OAuthTokenRevokeDto extends createZodDto(oAuthTokenRevokeSchema) {}

export const oAuthJWTSchema = z.object({
  iss: z.string(),
  sub: z.string(),
  aud: z.string(),
  exp: z.string(),
  jti: z.string(),
  iat: z.string(),
});

export class OAuthJWT extends createZodDto(oAuthJWTSchema) {}
