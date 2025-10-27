import { Test, TestingModule } from '@nestjs/testing';
import { BasicAuthService } from './basic.service';
import { AppConfigService } from '../../app-config/app-config.service';
import { APP_CONFIG } from '../../app-config/app-config.constants';
import { AppErrorCodes } from '../../types/error-codes';
import { OauthClientService } from '../../data-base/query/oauth-client/oauth-client.service';

describe('BasicAuthService', () => {
  let service: BasicAuthService;
  let mockOAuthClientService: Partial<OauthClientService>;

  const clientId = 'client123';
  const clientSecret = 'secret';
  const clientObj = {
    id: clientId,
    name: 'test',
    secret: 'hashed',
    redirectUris: [],
    permissionBitMask: BigInt(0),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockOAuthClientService = {
      authenticate: jest.fn().mockResolvedValue(clientObj),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BasicAuthService,
        {
          provide: OauthClientService,
          useValue: mockOAuthClientService,
        },
        AppConfigService,
        {
          provide: APP_CONFIG,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<BasicAuthService>(BasicAuthService);
  });

  it('should return client when header basic auth is valid', async () => {
    const authHeader =
      'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const request: any = { headers: { authorization: authHeader } };

    const res = await service.authenticate(request as any);
    expect(res).toEqual(clientObj);
    expect(
      (mockOAuthClientService.authenticate as jest.Mock).mock.calls.length,
    ).toBe(1);
  });

  it('should throw INVALID_CLIENT when secret is wrong', async () => {
    const clientId = 'client123';
    const clientSecret = 'wrong';

    (mockOAuthClientService.authenticate as jest.Mock).mockResolvedValue({
      id: clientId,
      secret: 'hashed',
    });
    (mockOAuthClientService.authenticate as jest.Mock).mockRejectedValue(
      AppErrorCodes.INVALID_CLIENT,
    );

    const authHeader =
      'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const request: any = { headers: { authorization: authHeader } };

    await expect(service.authenticate(request as any)).rejects.toEqual(
      AppErrorCodes.INVALID_CLIENT,
    );
  });

  it('should throw INVALID_CLIENT when client id not found', async () => {
    (mockOAuthClientService.authenticate as jest.Mock).mockRejectedValue(
      AppErrorCodes.INVALID_CLIENT,
    );

    const authHeader =
      'Basic ' + Buffer.from(`missing:${clientSecret}`).toString('base64');
    const request: any = { headers: { authorization: authHeader } };

    await expect(service.authenticate(request as any)).rejects.toEqual(
      AppErrorCodes.INVALID_CLIENT,
    );
  });

  it('should throw INVALID_CLIENT when no header or body provided', async () => {
    const request: any = { headers: {} };
    await expect(service.authenticate(request as any)).rejects.toThrow(
      AppErrorCodes.INVALID_CLIENT,
    );
  });
});
