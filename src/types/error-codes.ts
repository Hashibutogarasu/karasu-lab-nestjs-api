import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const defaultErrorSchema = z.object({
  key: z.string().default('UNKNOWN_ERROR'),
  code: z.number().default(500),
  isHttpError: z.boolean().default(true),
  name: z.string().default('Error'),
  customMessage: z.string().default('An error occurred'),
});

type ErrorType = z.infer<typeof defaultErrorSchema>;

const getErrorSchema = ({
  key,
  code,
  isHttpError,
  name,
  customMessage,
}: Partial<ErrorType> = {}) =>
  defaultErrorSchema.extend({
    key: z.string().default(key ?? 'UNKNOWN_ERROR'),
    code: z.number().default(code ?? 500),
    isHttpError: z.boolean().default(isHttpError ?? true),
    name: z.string().default(name ?? 'Error'),
    customMessage: z.string().default(customMessage ?? 'An error occurred'),
  });

export class ErrorDto extends createZodDto(getErrorSchema()) {}

export class AppErrorCode extends Error {
  public readonly key: string;
  public readonly code: number;
  public readonly isHttpError: boolean;
  public customMessage: string;
  public zodSchema: z.ZodObject<any>;
  public zodDtoClass: any;
  private static _instanceCounter = 0;

  constructor(zodSchema: z.ZodObject<any>) {
    super();
    this.name = this.constructor.name;
    this.key = this.name;
    const defaults = zodSchema.parse({}) as any;
    this.code = defaults.code ?? 500;
    this.isHttpError = defaults.isHttpError ?? true;
    this.customMessage = defaults.customMessage ?? 'An error occurred';
    this.message = this.customMessage;

    this.zodSchema = getErrorSchema({
      key: this.key,
      code: this.code,
      isHttpError: this.isHttpError,
      name: this.name,
      customMessage: this.customMessage,
    });

    const id = ++AppErrorCode._instanceCounter;
    const baseName = `AppErrorDto_${this.code}`;
    const className = `${baseName}_${id}`;
    const ZodDtoClass = class extends createZodDto(this.zodSchema) {};
    try {
      Object.defineProperty(ZodDtoClass, 'name', { value: className });
    } catch (e) {}
    this.zodDtoClass = ZodDtoClass;
  }

  setCustomMessage(message: string) {
    this.customMessage = message;
    return this;
  }

  get apiResponse() {
    return {
      status: this.code,
      type: this.zodDtoClass,
      schema: this.zodSchema,
    };
  }
}

export const AppErrorCodes = {
  // DataBase Errors
  INVALID_DATABASE_URL: new AppErrorCode(
    z.object({
      code: z.number().default(500),
      customMessage: z.string().default('The provided database URL is invalid'),
    }),
  ),
  DATABASE_CONNECTION_ERROR: new AppErrorCode(
    z.object({
      code: z.number().default(500),
      customMessage: z.string().default('Failed to connect to the database'),
    }),
  ),

  // Http Errors
  NOT_FOUND: new AppErrorCode(
    z.object({
      code: z.number().default(404),
      customMessage: z.string().default('Resource not found'),
    }),
  ),
  UNAUTHORIZED: new AppErrorCode(
    z.object({
      code: z.number().default(401),
      customMessage: z.string().default('Unauthorized'),
    }),
  ),
  FORBIDDEN: new AppErrorCode(
    z.object({
      code: z.number().default(403),
      customMessage: z.string().default('Forbidden'),
    }),
  ),
  CONFLICT: new AppErrorCode(
    z.object({
      code: z.number().default(409),
      customMessage: z.string().default('Conflict'),
    }),
  ),
  INTERNAL_SERVER_ERROR: new AppErrorCode(
    z.object({
      code: z.number().default(500),
      customMessage: z.string().default('Internal server error'),
    }),
  ),

  // External API Common Errors
  EXTERNAL_API_REQUEST_FAILED: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('External API request failed'),
    }),
  ),
  NO_CACHE_AVAILABLE_IN_DATABASE: new AppErrorCode(
    z.object({
      code: z.number().default(500),
      customMessage: z.string().default('No cache available in database'),
    }),
  ),
  INVALID_FORMAT: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('Invalid format'),
    }),
  ),

  // Auth Errors
  PROVIDER_NOT_FOUND: new AppErrorCode(
    z.object({
      code: z.number().default(404),
      customMessage: z.string().default('Provider not found'),
    }),
  ),
  EXTRA_USER_PROFILE_NOT_FOUND: new AppErrorCode(
    z.object({
      code: z.number().default(404),
      customMessage: z.string().default('Profile not found for this user'),
    }),
  ),
  INVALID_PROFILE_DATA: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('Invalid profile data'),
    }),
  ),
  VALIDATION_FAILED: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('Validation failed'),
    }),
  ),
  INVALID_REQUEST: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('Invalid request'),
    }),
  ),
  USER_EXISTS: new AppErrorCode(
    z.object({
      code: z.number().default(409),
      customMessage: z
        .string()
        .default('User with this email or username already exists'),
    }),
  ),
  WEAK_PASSWORD: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z
        .string()
        .default('Password does not meet security requirements'),
    }),
  ),
  INVALID_CREDENTIALS: new AppErrorCode(
    z.object({
      code: z.number().default(401),
      customMessage: z.string().default('Invalid username/email or password'),
    }),
  ),
  TOKEN_GENERATION_FAILED: new AppErrorCode(
    z.object({
      code: z.number().default(500),
      customMessage: z.string().default('Failed to generate token'),
    }),
  ),
  MISSING_SESSION: new AppErrorCode(
    z.object({
      code: z.number().default(401),
      customMessage: z.string().default('Session ID is required'),
    }),
  ),
  INVALID_SESSION: new AppErrorCode(
    z.object({
      code: z.number().default(401),
      customMessage: z.string().default('Invalid or expired session'),
    }),
  ),
  INVALID_TOKEN: new AppErrorCode(
    z.object({
      code: z.number().default(401),
      customMessage: z.string().default('Invalid or expired token'),
    }),
  ),
  USER_NOT_FOUND: new AppErrorCode(
    z.object({
      code: z.number().default(404),
      customMessage: z.string().default('User not found'),
    }),
  ),
  USER_GET_DATABASE_ERROR: new AppErrorCode(
    z.object({
      code: z.number().default(500),
      customMessage: z.string().default('Failed to get user from database'),
    }),
  ),
  USER_UPDATE_DATABASE_ERROR: new AppErrorCode(
    z.object({
      code: z.number().default(500),
      customMessage: z.string().default('Failed to update user in database'),
    }),
  ),
  INVALID_EMAIL_FORMAT: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('Invalid email format'),
    }),
  ),
  INVALID_USER_NAME: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('Invalid username format'),
    }),
  ),
  REVOKED_TOKEN: new AppErrorCode(
    z.object({
      code: z.number().default(401),
      customMessage: z.string().default('Token has been revoked'),
    }),
  ),
  EXPIRED_TOKEN: new AppErrorCode(
    z.object({
      code: z.number().default(401),
      customMessage: z.string().default('Token has expired'),
    }),
  ),
  USERNAME_ALREADY_EXISTS: new AppErrorCode(
    z.object({
      code: z.number().default(409),
      customMessage: z.string().default('Username already exists'),
    }),
  ),
  USER_CREATE_DATABASE_ERROR: new AppErrorCode(
    z.object({
      code: z.number().default(500),
      customMessage: z.string().default('Failed to create user in database'),
    }),
  ),

  // OAuth Errors
  UNSUPPORTED_PROVIDER: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z
        .string()
        .default('The specified provider is not supported'),
    }),
  ),
  PROVIDER_UNAVAILABLE: new AppErrorCode(
    z.object({
      code: z.number().default(503),
      customMessage: z
        .string()
        .default('The specified provider is not available'),
    }),
  ),
  INVALID_STATE_CODE: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('Invalid state code'),
    }),
  ),

  // Account Errors
  NOW_PASSWORD_IS_NOT_INVALID: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('Current password is not valid'),
    }),
  ),
  PASSWORD_ALREADY_SET: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z
        .string()
        .default(
          'Password is already set. If you want to change your password, please use the password reset feature.',
        ),
    }),
  ),
  ALREADY_TAKEN_USERNAME: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z
        .string()
        .default(
          'Failed to update username. The username may already be in use.',
        ),
    }),
  ),
  INVALID_RESET_CODE: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z
        .string()
        .default('Invalid reset code or the code has expired'),
    }),
  ),
  EMAIL_ALREADY_IN_USE: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('Email is already in use'),
    }),
  ),
  INVALID_VERIFICATION_CODE: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('Invalid verification code'),
    }),
  ),
  ALREADY_PENDING: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('Request is already pending'),
    }),
  ),

  // Developer Service Errors
  CLIENT_ID_ALREADY_EXISTS: new AppErrorCode(
    z.object({
      code: z.number().default(409),
      customMessage: z.string().default('Client ID already exists'),
    }),
  ),
  CLIENT_NOT_FOUND: new AppErrorCode(
    z.object({
      code: z.number().default(404),
      customMessage: z.string().default('Client not found'),
    }),
  ),

  // Dify API Errors
  NO_RESNPONSE_BODY: new AppErrorCode(
    z.object({
      code: z.number().default(500),
      customMessage: z
        .string()
        .default('No response body received from Dify API'),
    }),
  ),
  DIFY_API_ERROR: new AppErrorCode(
    z.object({
      code: z.number().default(500),
      customMessage: z.string().default('Dify API error'),
    }),
  ),
  CONNECTION_ERROR: new AppErrorCode(
    z.object({
      code: z.number().default(500),
      customMessage: z.string().default('Connection error'),
    }),
  ),
  INVALID_DIFY_API_KEY: new AppErrorCode(
    z.object({
      code: z.number().default(401),
      customMessage: z
        .string()
        .default('DIFY_API_KEY environment variable is required'),
    }),
  ),

  // Domain Guard Errors
  INVALID_DOMAIN_EMAIL: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z
        .string()
        .default('User email is required for domain validation'),
    }),
  ),

  // Discord App Errors
  EMPTY_ISO_STRING: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('Iso must be a non-empty string'),
      isHttpError: z.boolean().default(false),
    }),
  ),
  INVALID_ISO_TIMESTAMP: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('Invalid ISO timestamp'),
      isHttpError: z.boolean().default(false),
    }),
  ),

  // Encryption Service Errors
  MISSING_RSA: new AppErrorCode(
    z.object({
      code: z.number().default(500),
      customMessage: z
        .string()
        .default('Missing RSA key for encryption service'),
    }),
  ),
  INVALID_RSA_KEY: new AppErrorCode(
    z.object({
      code: z.number().default(500),
      customMessage: z
        .string()
        .default('Invalid RSA key configuration for encryption service'),
    }),
  ),
  INVALID_BASE64_INPUT: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('Invalid base64 input'),
    }),
  ),
  DECRYPTION_FAILED: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('Decryption failed'),
    }),
  ),
  ENCRYPTION_FAILED: new AppErrorCode(
    z.object({
      code: z.number().default(500),
      customMessage: z.string().default('Encryption failed'),
    }),
  ),
  MISSING_PLAIN_TEXT: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z
        .string()
        .default('Plain text is required for encryption'),
    }),
  ),
  MISSING_ENCRYPTED_TEXT: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z
        .string()
        .default('Encrypted text is required for decryption'),
    }),
  ),
  MISSING_CIPHER_TEXT: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z
        .string()
        .default('Cipher text is required for decryption'),
    }),
  ),

  // External Provider Access Token Errors
  EXTERNAL_PROVIDER_TOKEN_MISSING_FIELDS: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z
        .string()
        .default('userId, token and provider are required'),
    }),
  ),
  EXTERNAL_PROVIDER_TOKEN_ID_REQUIRED: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('id is required'),
    }),
  ),
  EXTERNAL_PROVIDER_TOKEN_USERID_REQUIRED: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('userId is required'),
    }),
  ),
  EXTERNAL_PROVIDER_TOKEN_ID_USERID_REQUIRED: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('id and userId are required'),
    }),
  ),

  // Permission Bitcalc Errors
  INVALID_PERMISSION: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z
        .string()
        .default('One or more provided permissions are invalid'),
    }),
  ),
  DUPLICATE_PERMISSION: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z
        .string()
        .default('Duplicate permissions are not allowed'),
    }),
  ),
  INVALID_PERMISSION_BITMASK: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z
        .string()
        .default('Provided permission bitmask contains invalid bits'),
    }),
  ),
  PERMISSION_DENIED: new AppErrorCode(
    z.object({
      code: z.number().default(403),
      customMessage: z.string().default('Permission denied'),
    }),
  ),

  // TOTP
  INVALID_DIGIT_CODE: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('Invalid digit code'),
    }),
  ),
  // MFA
  MFA_NOT_ENABLED: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z.string().default('MFA is not enabled for this user'),
    }),
  ),
  TOTP_ALREADY_ENABLED: new AppErrorCode(
    z.object({
      code: z.number().default(400),
      customMessage: z
        .string()
        .default('TOTP is already enabled for this user'),
    }),
  ),

  // Role
  ROLE_NOT_FOUND: new AppErrorCode(
    z.object({
      code: z.number().default(404),
      customMessage: z.string().default('Role not found'),
    }),
  ),

  // JWT State
  JWT_STATE_NOT_FOUND: new AppErrorCode(
    z.object({
      code: z.number().default(404),
      customMessage: z.string().default('JWT state not found'),
    }),
  ),
};
