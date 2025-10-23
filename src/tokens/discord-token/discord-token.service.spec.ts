import { Test, TestingModule } from '@nestjs/testing';
import { DiscordTokenService } from './discord-token.service';
import { mock } from 'jest-mock-extended';
import { DataBaseService } from '../../data-base/data-base.service';
import { UtilityService } from '../../data-base/utility/utility.service';
import { RoleService } from '../../data-base/query/role/role.service';
import { AppConfigService } from '../../app-config/app-config.service';

describe('DiscordTokenService', () => {
  let service: DiscordTokenService;
  beforeEach(async () => {
    jest.resetModules();

    const mockDatabaseService = mock<DataBaseService>();
    const mockUtilityService = mock<UtilityService>();
    const mockRoleService = mock<RoleService>();

    const mockAppConfigService = mock<AppConfigService>({
      get: jest.fn().mockResolvedValue({
        discordClientId: 'discord-client-id',
        discordClientSecret: 'discord-client-secret',
        discordRedirectUri: 'http://localhost:3000/auth/callback',
      })
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordTokenService,
        {
          provide: AppConfigService,
          useValue: mockAppConfigService,
        },
        {
          provide: DataBaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: UtilityService,
          useValue: mockUtilityService,
        },
        {
          provide: RoleService,
          useValue: mockRoleService,
        },
      ],
    }).compile();

    service = module.get<DiscordTokenService>(DiscordTokenService);
  });

  afterEach(() => {
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
