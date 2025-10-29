import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const transformStringToNumber = (defaultNumber: number) =>
  z
    .preprocess((val) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        if (val === '') return defaultNumber;
        const parsed = parseInt(val, 10);
        return Number.isNaN(parsed) ? defaultNumber : parsed;
      }
      if (val == null) return defaultNumber;
      const s = String(val);
      const p = parseInt(s, 10);
      return Number.isNaN(p) ? defaultNumber : p;
    }, z.number())
    .optional()
    .default(defaultNumber);

export const configSchema = z.object({
  PORT: transformStringToNumber(3000),
  BASE_URL: z.string().optional().default('http://localhost:3000'),
  ISSUER_URL: z.string().optional().default('http://localhost:3000'),
  REDIS_HOST: z.string().optional().default('localhost'),
  REDIS_PORT: transformStringToNumber(6379),
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional().default('http://localhost:3000'),
  DATABASE_HOST: z.string().optional().default('localhost'),
  DATABASE_PORT: transformStringToNumber(5432),
  DIFY_API_KEY: z.string().optional(),
  TOTP_ISSUER: z.string().optional().default('karasu-lab'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_REDIRECT_URI: z.string().url().optional(),
  X_CLIENT_ID: z.string().optional(),
  X_CLIENT_SECRET: z.string().optional(),
  ENCRYPTION_PRIVATE_KEY: z.string(),
  ENCRYPTION_PUBLIC_KEY: z.string(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  PRIVATE_DOMAIN: z.string().optional(),
  ADMIN_DOMAIN: z.string().optional(),
  I18N_DEFAULT_LANGUAGE: z.string().optional().default('en'),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().optional(),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().optional(),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().optional(),
  CLOUDFLARE_R2_CUSTOM_DOMAIN: z.string().optional(),
});

export class Configuration extends createZodDto(configSchema) {}

export default (env: Configuration) => ({
  port: env.PORT,
  baseUrl: env.BASE_URL,
  issuerUrl: env.ISSUER_URL ?? env.BASE_URL,
  redisHost: env.REDIS_HOST,
  redisPort: env.REDIS_PORT,
  databaseUrl: env.DATABASE_URL,
  directUrl: env.DIRECT_URL,
  difyApiKey: env.DIFY_API_KEY,
  totpIssuer: env.TOTP_ISSUER,
  googleClientId: env.GOOGLE_CLIENT_ID,
  googleClientSecret: env.GOOGLE_CLIENT_SECRET,
  discordClientId: env.DISCORD_CLIENT_ID,
  discordClientSecret: env.DISCORD_CLIENT_SECRET,
  discordRedirectUri: env.DISCORD_REDIRECT_URI,
  xClientId: env.X_CLIENT_ID,
  xClientSecret: env.X_CLIENT_SECRET,
  encryptionPrivateKey: env.ENCRYPTION_PRIVATE_KEY,
  encryptionPublicKey: env.ENCRYPTION_PUBLIC_KEY,
  resendApiKey: env.RESEND_API_KEY,
  resendFromEmail: env.RESEND_FROM_EMAIL,
  adminDomain: env.ADMIN_DOMAIN,
  privateDomain: env.PRIVATE_DOMAIN,
  i18nDefaultLanguage: env.I18N_DEFAULT_LANGUAGE,
  cloudflareAccountId: env.CLOUDFLARE_ACCOUNT_ID,
  cloudflareR2BucketName: env.CLOUDFLARE_R2_BUCKET_NAME,
  cloudflareR2AccessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  cloudflareR2SecretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  cloudflareR2CustomDomain: env.CLOUDFLARE_R2_CUSTOM_DOMAIN,
});
