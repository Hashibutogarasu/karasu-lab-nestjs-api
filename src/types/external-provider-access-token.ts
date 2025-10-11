import { z } from 'zod';

export const ExternalProviderAccessTokenCreateSchema = z.object({
  userId: z.string().min(1),
  encryptedToken: z.string().min(1),
  provider: z.string().min(1),
});

export const ExternalProviderAccessTokenUpdateSchema = z.object({
  encryptedToken: z.string().min(1).optional(),
  provider: z.string().min(1).optional(),
});

export const ExternalProviderAccessTokenRecordSchema =
  ExternalProviderAccessTokenCreateSchema.extend({
    id: z.string().min(1),
    createdAt: z.string(),
    updatedAt: z.string(),
  });

export const ExternalProviderAccessTokenDecryptedRecordSchema =
  ExternalProviderAccessTokenRecordSchema.extend({
    token: z.string().min(1),
  });

export type ExternalProviderAccessTokenCreateDto = z.infer<
  typeof ExternalProviderAccessTokenCreateSchema
>;
export type ExternalProviderAccessTokenUpdateDto = z.infer<
  typeof ExternalProviderAccessTokenUpdateSchema
>;
export type ExternalProviderAccessTokenRecord = z.infer<
  typeof ExternalProviderAccessTokenRecordSchema
>;
export type ExternalProviderAccessTokenDecryptedRecord = z.infer<
  typeof ExternalProviderAccessTokenDecryptedRecordSchema
>;

export default ExternalProviderAccessTokenRecordSchema;
