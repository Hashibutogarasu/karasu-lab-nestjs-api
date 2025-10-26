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

export const ExtraProfileScalarFieldEnumSchema = z.enum(['id','userId','provider','providerId','displayName','email','avatarUrl','rawProfile','createdAt','updatedAt']);

export const AuthStateScalarFieldEnumSchema = z.enum(['id','stateCode','oneTimeToken','provider','callbackUrl','userId','codeVerifier','codeChallenge','codeChallengeMethod','expiresAt','used','createdAt']);

export const PasswordResetScalarFieldEnumSchema = z.enum(['id','userId','resetCode','expiresAt','used','createdAt']);

export const JWTStateScalarFieldEnumSchema = z.enum(['id','userId','revoked','tokenHint','createdAt','updatedAt']);

export const ExternalProviderAccessTokenScalarFieldEnumSchema = z.enum(['id','userId','encryptedToken','provider','createdAt','updatedAt']);

export const GmoCoinStatusScalarFieldEnumSchema = z.enum(['id','statusCode','data','responsetime','createdAt','updatedAt']);

export const GmoCoinTickerItemScalarFieldEnumSchema = z.enum(['id','symbol','ask','bid','timestamp','status','tickerId','createdAt','updatedAt']);

export const GmoCoinTickerScalarFieldEnumSchema = z.enum(['id','statusCode','responsetime','createdAt','updatedAt']);

export const GmoCoinKlineItemScalarFieldEnumSchema = z.enum(['id','openTime','open','high','low','close','klineId','createdAt','updatedAt']);

export const GmoCoinKlineScalarFieldEnumSchema = z.enum(['id','statusCode','responsetime','createdAt','updatedAt']);

export const GmoCoinSymbolRuleScalarFieldEnumSchema = z.enum(['id','symbol','tickSize','minOpenOrderSize','maxOrderSize','sizeStep','rulesId','createdAt','updatedAt']);

export const GmoCoinRulesScalarFieldEnumSchema = z.enum(['id','statusCode','responsetime','createdAt','updatedAt']);

export const UserOTPScalarFieldEnumSchema = z.enum(['id','secret','issuedAt','lastAuthenticatedAt','issuerId','userId','setupCompleted','createdAt','updatedAt']);

export const OTPBackupCodeScalarFieldEnumSchema = z.enum(['id','hashedCode','createdAt','userOtpId']);

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
  createdAt: z.string().transform((val) => new Date(val)),
  updatedAt: z.string().transform((val) => new Date(val)),
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
  tokenHint: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type JWTState = z.infer<typeof JWTStateSchema>

/////////////////////////////////////////
// EXTERNAL PROVIDER ACCESS TOKEN SCHEMA
/////////////////////////////////////////

export const ExternalProviderAccessTokenSchema = z.object({
  id: z.cuid(),
  userId: z.string(),
  encryptedToken: z.string(),
  provider: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type ExternalProviderAccessToken = z.infer<typeof ExternalProviderAccessTokenSchema>

/////////////////////////////////////////
// GMO COIN STATUS SCHEMA
/////////////////////////////////////////

export const GmoCoinStatusSchema = z.object({
  id: z.cuid(),
  statusCode: z.number().int(),
  data: JsonValueSchema,
  responsetime: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type GmoCoinStatus = z.infer<typeof GmoCoinStatusSchema>

/////////////////////////////////////////
// GMO COIN TICKER ITEM SCHEMA
/////////////////////////////////////////

export const GmoCoinTickerItemSchema = z.object({
  id: z.cuid(),
  symbol: z.string(),
  ask: z.string(),
  bid: z.string(),
  timestamp: z.coerce.date(),
  status: z.string(),
  tickerId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type GmoCoinTickerItem = z.infer<typeof GmoCoinTickerItemSchema>

/////////////////////////////////////////
// GMO COIN TICKER SCHEMA
/////////////////////////////////////////

export const GmoCoinTickerSchema = z.object({
  id: z.cuid(),
  statusCode: z.number().int(),
  responsetime: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type GmoCoinTicker = z.infer<typeof GmoCoinTickerSchema>

/////////////////////////////////////////
// GMO COIN KLINE ITEM SCHEMA
/////////////////////////////////////////

export const GmoCoinKlineItemSchema = z.object({
  id: z.cuid(),
  openTime: z.coerce.date(),
  open: z.string(),
  high: z.string(),
  low: z.string(),
  close: z.string(),
  klineId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type GmoCoinKlineItem = z.infer<typeof GmoCoinKlineItemSchema>

/////////////////////////////////////////
// GMO COIN KLINE SCHEMA
/////////////////////////////////////////

export const GmoCoinKlineSchema = z.object({
  id: z.cuid(),
  statusCode: z.number().int(),
  responsetime: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type GmoCoinKline = z.infer<typeof GmoCoinKlineSchema>

/////////////////////////////////////////
// GMO COIN SYMBOL RULE SCHEMA
/////////////////////////////////////////

export const GmoCoinSymbolRuleSchema = z.object({
  id: z.cuid(),
  symbol: z.string(),
  tickSize: z.string(),
  minOpenOrderSize: z.string(),
  maxOrderSize: z.string(),
  sizeStep: z.string(),
  rulesId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type GmoCoinSymbolRule = z.infer<typeof GmoCoinSymbolRuleSchema>

/////////////////////////////////////////
// GMO COIN RULES SCHEMA
/////////////////////////////////////////

export const GmoCoinRulesSchema = z.object({
  id: z.cuid(),
  statusCode: z.number().int(),
  responsetime: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type GmoCoinRules = z.infer<typeof GmoCoinRulesSchema>

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
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type UserOTP = z.infer<typeof UserOTPSchema>

/////////////////////////////////////////
// OTP BACKUP CODE SCHEMA
/////////////////////////////////////////

export const OTPBackupCodeSchema = z.object({
  id: z.cuid(),
  hashedCode: z.string(),
  createdAt: z.coerce.date(),
  userOtpId: z.string(),
})

export type OTPBackupCode = z.infer<typeof OTPBackupCodeSchema>
