import { z } from 'zod';
import { Prisma } from '@prisma/client';

/////////////////////////////////////////
// HELPER FUNCTIONS
/////////////////////////////////////////

// JSON
//------------------------------------------------------

export type NullableJsonInput = Prisma.JsonValue | null | 'JsonNull' | 'DbNull' | Prisma.NullTypes.DbNull | Prisma.NullTypes.JsonNull;

export const transformJsonNull = (v?: NullableJsonInput) => {
  if (!v || v === 'DbNull') return Prisma.NullTypes.DbNull;
  if (v === 'JsonNull') return Prisma.NullTypes.JsonNull;
  return v;
};

export const JsonValueSchema: z.ZodType<Prisma.JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.literal(null),
    z.record(z.string(), z.lazy(() => JsonValueSchema.optional())),
    z.array(z.lazy(() => JsonValueSchema)),
  ])
);

export type JsonValueType = z.infer<typeof JsonValueSchema>;

export const NullableJsonValue = z
  .union([JsonValueSchema, z.literal('DbNull'), z.literal('JsonNull')])
  .nullable()
  .transform((v) => transformJsonNull(v));

export type NullableJsonValueType = z.infer<typeof NullableJsonValue>;

export const InputJsonValueSchema: z.ZodType<Prisma.InputJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.object({ toJSON: z.any() }),
    z.record(z.string(), z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
    z.array(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
  ])
);

export type InputJsonValueType = z.infer<typeof InputJsonValueSchema>;


/////////////////////////////////////////
// ENUMS
/////////////////////////////////////////

export const TransactionIsolationLevelSchema = z.enum(['ReadUncommitted','ReadCommitted','RepeatableRead','Serializable']);

export const UserScalarFieldEnumSchema = z.enum(['id','username','email','passwordHash','providers','createdAt','updatedAt']);

export const PendingEMailChangeProcessScalarFieldEnumSchema = z.enum(['id','userId','newEmail','verificationCode','expiresAt','used','createdAt']);

export const RoleScalarFieldEnumSchema = z.enum(['id','name','description','createdAt','updatedAt','bitmask']);

export const AuthorizationCodeScalarFieldEnumSchema = z.enum(['code','clientId','userId','redirectUri','scope','codeChallenge','codeChallengeMethod','expiresAt','createdAt']);

export const AccessTokenScalarFieldEnumSchema = z.enum(['token','clientId','userId','scope','expiresAt','createdAt']);

export const RefreshTokenScalarFieldEnumSchema = z.enum(['token','accessToken','clientId','userId','scope','expiresAt','createdAt']);

export const ExtraProfileScalarFieldEnumSchema = z.enum(['id','userId','provider','providerId','displayName','email','avatarUrl','rawProfile','linkingVerified','createdAt','updatedAt']);

export const AuthStateScalarFieldEnumSchema = z.enum(['id','stateCode','oneTimeToken','provider','callbackUrl','userId','codeVerifier','codeChallenge','codeChallengeMethod','expiresAt','used','createdAt']);

export const ExternalProviderLinkVerifyScalarFieldEnumSchema = z.enum(['id','provider','rawExternalProviderProfile','userId','verifyHashedCode','expiresAt','createdAt','updatedAt']);

export const PasswordResetScalarFieldEnumSchema = z.enum(['id','userId','resetCode','expiresAt','used','createdAt']);

export const JWTStateScalarFieldEnumSchema = z.enum(['id','userId','revoked','sessionId','createdAt','updatedAt','expiresAt']);

export const SessionScalarFieldEnumSchema = z.enum(['id','userId','jti','createdAt','updatedAt']);

export const ExternalProviderAccessTokenScalarFieldEnumSchema = z.enum(['id','userId','encryptedToken','provider','linkingVerified','createdAt','updatedAt']);

export const UserOTPScalarFieldEnumSchema = z.enum(['id','secret','issuedAt','lastAuthenticatedAt','issuerId','userId','setupCompleted','createdAt','updatedAt']);

export const OTPBackupCodeScalarFieldEnumSchema = z.enum(['id','hashedCode','createdAt','userOtpId']);

export const OAuthClientScalarFieldEnumSchema = z.enum(['id','name','secret','redirectUris','permissionBitMask','userId','createdAt','updatedAt']);

export const OAuthGrantedTokenScalarFieldEnumSchema = z.enum(['jti','userId','permissionBitMask','expiryAt','clientId']);

export const SortOrderSchema = z.enum(['asc','desc']);

export const JsonNullValueInputSchema = z.enum(['JsonNull',]).transform((value) => (value === 'JsonNull' ? Prisma.JsonNull : value));

export const QueryModeSchema = z.enum(['default','insensitive']);

export const NullsOrderSchema = z.enum(['first','last']);

export const JsonNullValueFilterSchema = z.enum(['DbNull','JsonNull','AnyNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.DbNull : value === 'AnyNull' ? Prisma.AnyNull : value);
/////////////////////////////////////////
// MODELS
/////////////////////////////////////////

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  passwordHash: z.string().optional().nullable().nullable(),
  providers: z.string().array(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type User = z.infer<typeof UserSchema>

/////////////////////////////////////////
// PENDING E MAIL CHANGE PROCESS SCHEMA
/////////////////////////////////////////

export const PendingEMailChangeProcessSchema = z.object({
  id: z.cuid(),
  userId: z.string(),
  newEmail: z.string(),
  verificationCode: z.string(),
  expiresAt: z.coerce.date(),
  used: z.boolean(),
  createdAt: z.coerce.date(),
})

export type PendingEMailChangeProcess = z.infer<typeof PendingEMailChangeProcessSchema>

/////////////////////////////////////////
// ROLE SCHEMA
/////////////////////////////////////////

export const RoleSchema = z.object({
  id: z.cuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  bitmask: z.number().int(),
})

export type Role = z.infer<typeof RoleSchema>

/////////////////////////////////////////
// AUTHORIZATION CODE SCHEMA
/////////////////////////////////////////

export const AuthorizationCodeSchema = z.object({
  code: z.string(),
  clientId: z.string(),
  userId: z.string(),
  redirectUri: z.string(),
  scope: z.string().nullable(),
  codeChallenge: z.string().nullable(),
  codeChallengeMethod: z.string().nullable(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
})

export type AuthorizationCode = z.infer<typeof AuthorizationCodeSchema>

/////////////////////////////////////////
// ACCESS TOKEN SCHEMA
/////////////////////////////////////////

export const AccessTokenSchema = z.object({
  token: z.string(),
  clientId: z.string(),
  userId: z.string(),
  scope: z.string().nullable(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
})

export type AccessToken = z.infer<typeof AccessTokenSchema>

/////////////////////////////////////////
// REFRESH TOKEN SCHEMA
/////////////////////////////////////////

export const RefreshTokenSchema = z.object({
  token: z.string(),
  accessToken: z.string(),
  clientId: z.string(),
  userId: z.string(),
  scope: z.string().nullable(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
})

export type RefreshToken = z.infer<typeof RefreshTokenSchema>

/////////////////////////////////////////
// EXTRA PROFILE SCHEMA
/////////////////////////////////////////

export const ExtraProfileSchema = z.object({
  id: z.cuid(),
  userId: z.string(),
  provider: z.string(),
  providerId: z.string(),
  displayName: z.string().nullable(),
  email: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  rawProfile: JsonValueSchema,
  linkingVerified: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type ExtraProfile = z.infer<typeof ExtraProfileSchema>

/////////////////////////////////////////
// AUTH STATE SCHEMA
/////////////////////////////////////////

export const AuthStateSchema = z.object({
  id: z.cuid(),
  stateCode: z.string(),
  oneTimeToken: z.string(),
  provider: z.string(),
  callbackUrl: z.string(),
  userId: z.string().nullable(),
  codeVerifier: z.string().nullable(),
  codeChallenge: z.string().nullable(),
  codeChallengeMethod: z.string().nullable(),
  expiresAt: z.coerce.date(),
  used: z.boolean(),
  createdAt: z.coerce.date(),
})

export type AuthState = z.infer<typeof AuthStateSchema>

/////////////////////////////////////////
// EXTERNAL PROVIDER LINK VERIFY SCHEMA
/////////////////////////////////////////

export const ExternalProviderLinkVerifySchema = z.object({
  id: z.cuid(),
  provider: z.string(),
  rawExternalProviderProfile: JsonValueSchema,
  userId: z.string(),
  verifyHashedCode: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type ExternalProviderLinkVerify = z.infer<typeof ExternalProviderLinkVerifySchema>

/////////////////////////////////////////
// PASSWORD RESET SCHEMA
/////////////////////////////////////////

export const PasswordResetSchema = z.object({
  id: z.cuid(),
  userId: z.string(),
  resetCode: z.string(),
  expiresAt: z.coerce.date(),
  used: z.boolean(),
  createdAt: z.coerce.date(),
})

export type PasswordReset = z.infer<typeof PasswordResetSchema>

/////////////////////////////////////////
// JWT STATE SCHEMA
/////////////////////////////////////////

export const JWTStateSchema = z.object({
  id: z.cuid(),
  userId: z.string(),
  revoked: z.boolean(),
  sessionId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  expiresAt: z.coerce.date().nullable(),
})

export type JWTState = z.infer<typeof JWTStateSchema>

/////////////////////////////////////////
// SESSION SCHEMA
/////////////////////////////////////////

export const SessionSchema = z.object({
  id: z.cuid(),
  userId: z.string(),
  jti: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Session = z.infer<typeof SessionSchema>

/////////////////////////////////////////
// EXTERNAL PROVIDER ACCESS TOKEN SCHEMA
/////////////////////////////////////////

export const ExternalProviderAccessTokenSchema = z.object({
  id: z.cuid(),
  userId: z.string(),
  encryptedToken: z.string(),
  provider: z.string(),
  linkingVerified: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type ExternalProviderAccessToken = z.infer<typeof ExternalProviderAccessTokenSchema>

/////////////////////////////////////////
// USER OTP SCHEMA
/////////////////////////////////////////

export const UserOTPSchema = z.object({
  id: z.cuid(),
  secret: z.string(),
  issuedAt: z.coerce.date(),
  lastAuthenticatedAt: z.coerce.date().nullable(),
  issuerId: z.string(),
  userId: z.string(),
  setupCompleted: z.boolean(),
  createdAt: z.bigint(),
  updatedAt: z.bigint(),
})

export type UserOTP = z.infer<typeof UserOTPSchema>

/////////////////////////////////////////
// OTP BACKUP CODE SCHEMA
/////////////////////////////////////////

export const OTPBackupCodeSchema = z.object({
  id: z.cuid(),
  hashedCode: z.string(),
  createdAt: z.bigint(),
  userOtpId: z.string(),
})

export type OTPBackupCode = z.infer<typeof OTPBackupCodeSchema>

/////////////////////////////////////////
// O AUTH CLIENT SCHEMA
/////////////////////////////////////////

export const OAuthClientSchema = z.object({
  id: z.cuid(),
  name: z.string(),
  secret: z.string(),
  redirectUris: z.string().array(),
  permissionBitMask: z.number().int(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type OAuthClient = z.infer<typeof OAuthClientSchema>

/////////////////////////////////////////
// O AUTH GRANTED TOKEN SCHEMA
/////////////////////////////////////////

export const OAuthGrantedTokenSchema = z.object({
  jti: z.string(),
  userId: z.string(),
  permissionBitMask: z.number().int(),
  expiryAt: z.coerce.date(),
  clientId: z.string(),
})

export type OAuthGrantedToken = z.infer<typeof OAuthGrantedTokenSchema>
