export class AppErrorCode extends Error {
  public readonly key: string;
  public readonly code: string | number;
  public readonly isHttpError: boolean;

  constructor(
    code: string | number,
    message: string,
    isHttpError: boolean = false,
  ) {
    super(message);
    this.key = this.name;
    this.code = code;
    this.isHttpError = isHttpError;
    this.name = this.constructor.name;
  }
}

export const AppErrorCodes = {
  // Http Errors
  NOT_FOUND: new AppErrorCode(404, 'Resource not found', true),
  UNAUTHORIZED: new AppErrorCode(401, 'Unauthorized', true),
  FORBIDDEN: new AppErrorCode(403, 'Forbidden', true),
  INTERNAL_SERVER_ERROR: new AppErrorCode(500, 'Internal server error', true),

  // Auth Errors
  VALIDATION_FAILED: new AppErrorCode(400, 'Validation failed', true),
  INVALID_REQUEST: new AppErrorCode(400, 'Invalid request', true),
  USER_EXISTS: new AppErrorCode(
    409,
    'User with this email or username already exists',
    true,
  ),
  WEAK_PASSWORD: new AppErrorCode(
    400,
    'Password does not meet security requirements',
    true,
  ),
  INVALID_CREDENTIALS: new AppErrorCode(
    401,
    'Invalid username/email or password',
    true,
  ),
  TOKEN_GENERATION_FAILED: new AppErrorCode(
    500,
    'Failed to generate token',
    true,
  ),
  MISSING_SESSION: new AppErrorCode(401, 'Session ID is required', true),
  INVALID_SESSION: new AppErrorCode(401, 'Invalid or expired session', true),
  INVALID_TOKEN: new AppErrorCode(401, 'Invalid or expired token', true),

  // OAuth Errors
  UNSUPPORTED_PROVIDER: new AppErrorCode(
    400,
    'The specified provider is not supported',
    true,
  ),
  PROVIDER_UNAVAILABLE: new AppErrorCode(
    503,
    'The specified provider is not available',
    true,
  ),
};
