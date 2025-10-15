export class AppErrorCode extends Error {
  public readonly key: string;
  public readonly code: string | number;
  public readonly isHttpError: boolean;
  public customMessage: string;

  constructor(
    code: string | number,
    message: string,
    isHttpError: boolean = true,
  ) {
    super(message);
    this.key = this.name;
    this.code = code;
    this.isHttpError = isHttpError;
    this.name = this.constructor.name;
  }

  setCustomMesage(message: string) {
    this.customMessage = message;
    return this;
  }
}

export const AppErrorCodes = {
  // Http Errors
  NOT_FOUND: new AppErrorCode(404, 'Resource not found'),
  UNAUTHORIZED: new AppErrorCode(401, 'Unauthorized'),
  FORBIDDEN: new AppErrorCode(403, 'Forbidden'),
  INTERNAL_SERVER_ERROR: new AppErrorCode(500, 'Internal server error'),

  // External API Common Errors
  EXTERNAL_API_REQUEST_FAILED: new AppErrorCode(
    400,
    'External API request failed',
  ),
  NO_CACHE_AVAILABLE_IN_DATABASE: new AppErrorCode(
    500,
    'No cache available in database',
  ),
  INVALID_FORMAT: new AppErrorCode(400, 'Invalid format'),

  // Auth Errors
  PROVIDER_NOT_FOUND: new AppErrorCode(404, 'Provider not found'),
  EXTRA_USER_PROFILE_NOT_FOUND: new AppErrorCode(
    404,
    'profile not found for this user',
  ),
  INVALID_PROFILE_DATA: new AppErrorCode(400, 'Invalid profile data'),
  VALIDATION_FAILED: new AppErrorCode(400, 'Validation failed'),
  INVALID_REQUEST: new AppErrorCode(400, 'Invalid request'),
  USER_EXISTS: new AppErrorCode(
    409,
    'User with this email or username already exists',
  ),
  WEAK_PASSWORD: new AppErrorCode(
    400,
    'Password does not meet security requirements',
  ),
  INVALID_CREDENTIALS: new AppErrorCode(
    401,
    'Invalid username/email or password',
  ),
  TOKEN_GENERATION_FAILED: new AppErrorCode(500, 'Failed to generate token'),
  MISSING_SESSION: new AppErrorCode(401, 'Session ID is required'),
  INVALID_SESSION: new AppErrorCode(401, 'Invalid or expired session'),
  INVALID_TOKEN: new AppErrorCode(401, 'Invalid or expired token'),
  USER_NOT_FOUND: new AppErrorCode(404, 'User not found'),
  USER_GET_DATABASE_ERROR: new AppErrorCode(
    500,
    'Failed to get user from database',
  ),
  USER_UPDATE_DATABASE_ERROR: new AppErrorCode(
    500,
    'Failed to update user in database',
  ),
  INVALID_EMAIL_FORMAT: new AppErrorCode(400, 'Invalid email format'),
  INVALID_USER_NAME: new AppErrorCode(400, 'Invalid username format'),
  REVOKED_TOKEN: new AppErrorCode(401, 'Token has been revoked'),
  EXPIRED_TOKEN: new AppErrorCode(401, 'Token has expired'),

  // OAuth Errors
  UNSUPPORTED_PROVIDER: new AppErrorCode(
    400,
    'The specified provider is not supported',
  ),
  PROVIDER_UNAVAILABLE: new AppErrorCode(
    503,
    'The specified provider is not available',
  ),

  // Account Errors
  NOW_PASSWORD_IS_NOT_INVALID: new AppErrorCode(
    400,
    'Current password is not valid',
  ),
  PASSWORD_ALREADY_SET: new AppErrorCode(
    400,
    'Password is already set. If you want to change your password, please use the password reset feature.',
  ),
  ALREADY_TAKEN_USERNAME: new AppErrorCode(
    400,
    'Failed to update username. The username may already be in use.',
  ),
  INVALID_RESET_CODE: new AppErrorCode(
    400,
    'Invalid reset code or the code has expired',
  ),

  // Developer Service Errors
  CLIENT_ID_ALREADY_EXISTS: new AppErrorCode(409, 'Client ID already exists'),
  CLIENT_NOT_FOUND: new AppErrorCode(404, 'Client not found'),

  // Dify API Errors
  NO_RESNPONSE_BODY: new AppErrorCode(
    500,
    'No response body received from Dify API',
  ),
  DIFY_API_ERROR: new AppErrorCode(500, 'Dify API error'),
  CONNECTION_ERROR: new AppErrorCode(500, 'Connection error'),
  INVALID_DIFY_API_KEY: new AppErrorCode(
    401,
    'DIFY_API_KEY environment variable is required',
  ),

  // Domain Guard Errors
  INVALID_DOMAIN_EMAIL: new AppErrorCode(
    400,
    'User email is required for domain validation',
  ),

  // Discord App Errors
  EMPTY_ISO_STRING: new AppErrorCode(
    400,
    'Iso must be a non-empty string',
    false,
  ),
  INVALID_ISO_TIMESTAMP: new AppErrorCode(400, 'Invalid ISO timestamp', false),

  // Encryption Service Errors
  MISSING_RSA: new AppErrorCode(500, 'Missing RSA key for encryption service'),
  INVALID_RSA_KEY: new AppErrorCode(
    500,
    'Invalid RSA key configuration for encryption service',
  ),
  INVALID_BASE64_INPUT: new AppErrorCode(400, 'Invalid base64 input'),
  DECRYPTION_FAILED: new AppErrorCode(400, 'Decryption failed'),
  ENCRYPTION_FAILED: new AppErrorCode(500, 'Encryption failed'),
  MISSING_PLAIN_TEXT: new AppErrorCode(
    400,
    'Plain text is required for encryption',
  ),
  MISSING_CIPHER_TEXT: new AppErrorCode(
    400,
    'Cipher text is required for decryption',
  ),

  // External Provider Access Token Errors
  EXTERNAL_PROVIDER_TOKEN_MISSING_FIELDS: new AppErrorCode(
    400,
    'userId, token and provider are required',
  ),
  EXTERNAL_PROVIDER_TOKEN_ID_REQUIRED: new AppErrorCode(400, 'id is required'),
  EXTERNAL_PROVIDER_TOKEN_USERID_REQUIRED: new AppErrorCode(
    400,
    'userId is required',
  ),
  EXTERNAL_PROVIDER_TOKEN_ID_USERID_REQUIRED: new AppErrorCode(
    400,
    'id and userId are required',
  ),

  // Permission Bitcalc Errors
  INVALID_PERMISSION: new AppErrorCode(
    400,
    'One or more provided permissions are invalid',
  ),
  DUPLICATE_PERMISSION: new AppErrorCode(
    400,
    'Duplicate permissions are not allowed',
  ),
  INVALID_PERMISSION_BITMASK: new AppErrorCode(
    400,
    'Provided permission bitmask contains invalid bits',
  ),
  PERMISSION_DENIED: new AppErrorCode(403, 'Permission denied'),
};
