const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  getProfile: jest.fn(),
  logout: jest.fn(),
  validateSession: jest.fn(),
  validatePassword: jest.fn(),
  validateUsername: jest.fn(),
  validateEmail: jest.fn(),
  cleanupExpiredSessions: jest.fn(),
};

const mockExternalProviderAccessTokenService = {
  save: jest.fn(),
  getById: jest.fn(),
  getByUserId: jest.fn(),
  getDecryptedById: jest.fn(),
  update: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
};

const mockGoogleProvider = {
  getProvider: jest.fn().mockReturnValue('google'),
  getAuthorizationUrl: jest.fn(),
  processOAuth: jest.fn(),
  isAvailable: jest.fn().mockReturnValue(true),
};

const mockDiscordProvider = {
  getProvider: jest.fn().mockReturnValue('discord'),
  getAuthorizationUrl: jest.fn(),
  processOAuth: jest.fn(),
  isAvailable: jest.fn().mockReturnValue(true),
};

export {
  mockAuthService,
  mockExternalProviderAccessTokenService,
  mockGoogleProvider,
  mockDiscordProvider,
};
