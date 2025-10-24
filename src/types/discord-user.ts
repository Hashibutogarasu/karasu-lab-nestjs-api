import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Discord Clan スキーマ
const DiscordClanSchema = z.object({
  tag: z.string(),
  badge: z.string(),
  identity_enabled: z.boolean(),
  identity_guild_id: z.string(),
});

// Discord Primary Guild スキーマ
const DiscordPrimaryGuildSchema = z.object({
  tag: z.string(),
  badge: z.string(),
  identity_enabled: z.boolean(),
  identity_guild_id: z.string(),
});

// Discord Avatar Decoration Data スキーマ
const DiscordAvatarDecorationDataSchema = z
  .object({
    asset: z.string(),
    sku_id: z.string(),
  })
  .nullable();

// Discord User スキーマ
export const DiscordUserSchema = z.object({
  id: z.string(),
  clan: DiscordClanSchema.nullable().optional(),
  email: z.string().email(),
  flags: z.number(),
  avatar: z.string().nullable(),
  banner: z.string().nullable(),
  locale: z.string(),
  username: z.string(),
  verified: z.boolean(),
  global_name: z.string().nullable(),
  mfa_enabled: z.boolean(),
  accent_color: z.number().nullable(),
  banner_color: z.string().nullable(),
  collectibles: z.any().nullable(),
  premium_type: z.number(),
  public_flags: z.number(),
  discriminator: z.string(),
  primary_guild: DiscordPrimaryGuildSchema.nullable().optional(),
  display_name_styles: z.any().nullable(),
  avatar_decoration_data: DiscordAvatarDecorationDataSchema.nullable(),
});

export class DiscordUser extends createZodDto(DiscordUserSchema) { };
export type DiscordClan = z.infer<typeof DiscordClanSchema>;
export type DiscordPrimaryGuild = z.infer<typeof DiscordPrimaryGuildSchema>;
export type DiscordAvatarDecorationData = z.infer<
  typeof DiscordAvatarDecorationDataSchema
>;
