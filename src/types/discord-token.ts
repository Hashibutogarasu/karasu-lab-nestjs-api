import { z } from 'zod';

export const DiscordTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number().optional(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

export type DiscordTokenResponse = z.infer<typeof DiscordTokenResponseSchema>;

export const DiscordRevokeResponseSchema = z.object({
  success: z.boolean().optional(),
});

export type DiscordRevokeResponse = z.infer<typeof DiscordRevokeResponseSchema>;
