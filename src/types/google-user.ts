import { z } from 'zod';

// Google User スキーマ
export const GoogleUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  picture: z.string().url(),
  given_name: z.string(),
  family_name: z.string(),
  verified_email: z.boolean(),
});

export type GoogleUser = z.infer<typeof GoogleUserSchema>;
