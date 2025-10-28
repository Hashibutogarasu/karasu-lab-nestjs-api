import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const oAuthAuthorizeQuerySchema = z.object({
  response_type: z.string(),
  client_id: z.string(),
  redirect_uri: z.url(),
  scope: z.string(),
  state: z.string(),
  code_challenge: z.string(),
  code_challenge_method: z.string(),
});

export class OAuthAuthorizeQuery extends createZodDto(
  oAuthAuthorizeQuerySchema,
) {}

export const oAuthTokenBodySchema = z.object({
  grant_type: z.string(),
  code: z.string().optional(),
  redirect_uri: z.string().optional(),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
  refresh_token: z.string().optional(),
  code_verifier: z.string().optional(),
});

export class OAuthTokenBodyDto extends createZodDto(oAuthTokenBodySchema) {}

export const oAuthTokenRevokeSchema = z.object({
  token: z.string(),
  client_id: z.string(),
  client_secret: z.string().optional(),
});

export const oAuthTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
});

export class OAuthTokenResponseDto extends createZodDto(
  oAuthTokenResponseSchema,
) {}

export class OAuthTokenRevokeDto extends createZodDto(oAuthTokenRevokeSchema) {}

export const commonJwtPayloadSchema = z
  .object({
    iss: z.string(),
    sub: z.string(),
    exp: z.number(),
    jti: z.string(),
    iat: z.number(),
  })
  .partial();

export class CommonJWTPayload extends createZodDto(commonJwtPayloadSchema) {}

export const oAuthJWTSchema = commonJwtPayloadSchema.extend({
  aud: z.string(),
});

export class OAuthJWT extends createZodDto(oAuthJWTSchema) {}

export const openIdConnectUserProfileSchema = z.object({
  sub: z.string(),
  name: z.string().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  preferred_username: z.string().optional(),
  picture: z.string().optional(),
  profile: z.string().optional(),
  updated_at: z.number().optional(),
  email: z.string().optional(),
  email_verified: z.boolean().optional(),
  address: z.object({}).optional(),
  phone_number: z.string().optional(),
  phone_number_verified: z.boolean().optional(),
});

export class OpenIdConnectUserProfile extends createZodDto(
  openIdConnectUserProfileSchema,
) {}
