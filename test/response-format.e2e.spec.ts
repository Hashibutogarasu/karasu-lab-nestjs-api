import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppService } from '../src/app.service';
import { ResponseFormatterInterceptor } from '../src/interceptors/response-formatter.interceptor';
import { AppController } from '../src/app.controller';
import { OAuthProviderFactory } from '../src/lib/auth/oauth-provider.factory';
import { GoogleOAuthProvider } from '../src/lib/auth/google-oauth.provider';
import { DiscordOAuthProvider } from '../src/lib/auth/discord-oauth.provider';
import { XOAuthProvider } from '../src/lib/auth/x-oauth.provider';
import { JwtTokenService } from '../src/auth/jwt-token/jwt-token.service';
import { UserService } from '../src/data-base/query/user/user.service';
import { JwtstateService } from '../src/data-base/query/jwtstate/jwtstate.service';
import { DataBaseService } from '../src/data-base/data-base.service';
import { UtilityService } from '../src/data-base/utility/utility.service';
import { RoleService } from '../src/data-base/query/role/role.service';
import { PermissionBitcalcService } from '../src/permission-bitcalc/permission-bitcalc.service';

jest.setTimeout(30000);

describe('Global Response Formatter & NoInterceptor (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        OAuthProviderFactory,
        GoogleOAuthProvider,
        DiscordOAuthProvider,
        XOAuthProvider,
        JwtTokenService,
        UserService,
        JwtstateService,
        DataBaseService,
        UtilityService,
        RoleService,
        PermissionBitcalcService,
        {
          provide: APP_INTERCEPTOR,
          useClass: ResponseFormatterInterceptor,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /ping (no decorator) should be formatted', async () => {
    const res = await request(app.getHttpServer()).get('/ping').expect(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        message: expect.any(String),
        data: { ping: true },
      }),
    );
  }, 20000);

  it('GET /raw-ping (@NoInterceptor) should NOT be formatted', async () => {
    const res = await request(app.getHttpServer()).get('/raw-ping').expect(200);

    // raw body without wrapping
    expect(res.body).toEqual({ ping: true });
  }, 20000);
});
