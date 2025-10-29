import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const openIdConfigurationSchema = z.object({
  issuer: z.url(),
  authorization_endpoint: z.url(),
  token_endpoint: z.url(),
  userinfo_endpoint: z.url(),
  jwks_uri: z.url(),
  scopes_supported: z.array(z.string()),
  response_types_supported: z.array(z.string()),
  token_endpoint_auth_methods_supported: z.array(z.string()),
  grant_types_supported: z.array(z.string()),
  code_challenge_methods_supported: z.array(z.string()),
});

export class OpenIdConfigurationDto extends createZodDto(
  openIdConfigurationSchema,
) {}
