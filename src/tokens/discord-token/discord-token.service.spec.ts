import { Test, TestingModule } from '@nestjs/testing';
import { DiscordTokenService } from './discord-token.service';
import { getGlobalModule } from '../../utils/test/global-modules';

// node-fetch is used in the service; we'll mock global.fetch for tests
describe('DiscordTokenService', () => {
  let service: DiscordTokenService;

  const OLD_ENV = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    process.env.DISCORD_CLIENT_ID = 'discord-client-id';
    process.env.DISCORD_CLIENT_SECRET = 'discord-client-secret';
    process.env.DISCORD_CALLBACK_URL = 'http://localhost:3000/auth/callback';

    // create testing module
    const module: TestingModule = await getGlobalModule({
      providers: [DiscordTokenService],
    }).compile();

    service = module.get<DiscordTokenService>(DiscordTokenService);
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should exchange authorization code for token', async () => {
    const mockResponse = {
      access_token: 'access123',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'refresh123',
      scope: 'identify email',
    };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await service.exchangeCode('auth_code_abc');
    expect(result.access_token).toBe('access123');
    expect(result.refresh_token).toBe('refresh123');
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should revoke token successfully when 200 empty body', async () => {
    // return 200 with empty body
    global.fetch = jest.fn().mockResolvedValueOnce({
      status: 200,
      json: async () => {
        throw new Error('empty');
      },
    });

    const result = await service.revokeToken('access123');
    expect(result).toEqual(expect.objectContaining({ success: true }));
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should throw on exchange when discord returns error', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'invalid_grant' }),
    });

    await expect(service.exchangeCode('bad_code')).rejects.toThrow();
  });

  it('should throw on revoke when non-200', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      status: 400,
      text: async () => 'bad request',
    });

    await expect(service.revokeToken('token123')).rejects.toThrow();
  });
});
