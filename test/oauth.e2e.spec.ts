import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { OauthController } from '../src/oauth/oauth.controller';
import { OauthService } from '../src/oauth/oauth.service';
import { AppErrorCodeFilter } from '../src/filters/app-error-code.filter';
import { AppConfigService } from '../src/app-config/app-config.service';
import { PermissionService } from '../src/permission/permission.service';
import { PermissionBitcalcService } from '../src/permission-bitcalc/permission-bitcalc.service';
import { AuthorizationCodeService } from '../src/data-base/query/authorization-code/authorization-code.service';
import { UserService } from '../src/data-base/query/user/user.service';
import { OauthClientService } from '../src/data-base/query/oauth-client/oauth-client.service';
import { OauthGrantedTokenService } from '../src/data-base/query/oauth-granted-token/oauth-granted-token.service';
import { JwtTokenService } from '../src/auth/jwt-token/jwt-token.service';
import { OAuthClient } from '@prisma/client';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { setAuthUserModuleRef } from '../src/auth/decorators/auth-user.decorator';
import { BasicOAuthGuard } from '../src/oauth/basic/basic.guard';
import { AppErrorCodes } from '../src/types/error-codes';
import { I18nTranslateService } from '../src/i18n-translate/i18n-translate.service';
import { mock } from 'jest-mock-extended';

describe('OAuth e2e (PKCE) flow', () => {
  let app: INestApplication;

  const clients: Record<string, OAuthClient & { redirectUris: string[] }> = {};
  const authCodes: Record<string, any> = {};
  const grants: Record<string, any> = {};

  const mockAuthorizationCodeService = mock<AuthorizationCodeService>({
    createAuthorizationCode: jest.fn().mockImplementation(async (data: any) => {
      const code = `code-${Date.now()}`;
      authCodes[code] = {
        code,
        clientId: data.clientId,
        userId: data.userId,
        redirectUri: data.redirectUri,
        scope: data.scope,
        codeChallenge: data.codeChallenge,
        codeChallengeMethod: data.codeChallengeMethod,
        expiresAt: new Date(Date.now() + 1000 * 60 * 10),
      };
      return code;
    }),
    consumeAuthorizationCode: jest
      .fn()
      .mockImplementation(async (code: string) => {
        const entry = authCodes[code];
        if (!entry) return null;
        delete authCodes[code];
        return entry;
      }),
    verifyCodeChallenge: jest
      .fn()
      .mockImplementation(
        (_verifier: string, _challenge: string, _method = 'S256') => {
          return true;
        },
      ),
  });

  const mockOauthClientService = mock<OauthClientService>({
    findById: jest.fn().mockImplementation(async (id: string) => {
      return clients[id] ?? null;
    }),
  });

  const mockUserService = mock<UserService>({
    findById: jest.fn().mockImplementation(async (id: string) => {
      const isAdmin = id.startsWith('admin');
      const bitmask = isAdmin ? (1 << 3) | (1 << 0) : 3; // admin: USER_READ + ADMIN_READ, general: USER_READ + USER_WRITE
      return {
        id,
        username: 'u_' + id,
        email: `${id}@example.test`,
        roles: [
          {
            id: isAdmin ? 'r_admin' : 'r1',
            name: isAdmin ? 'admin' : 'role1',
            bitmask,
          },
        ],
        providers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }),
    findUserById: jest.fn().mockImplementation(async (id: string) => {
      const isAdmin = id.startsWith('admin');
      const bitmask = isAdmin ? (1 << 3) | (1 << 0) : 3;
      return {
        id,
        username: 'u_' + id,
        email: `${id}@example.test`,
        roles: [
          {
            id: isAdmin ? 'r_admin' : 'r1',
            name: isAdmin ? 'admin' : 'role1',
            bitmask,
          },
        ],
        providers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }),
    exists: jest.fn().mockResolvedValue(true),
  });

  const mockJwtTokenService = mock<JwtTokenService>({
    encodePayload: jest.fn().mockImplementation((payload: any) => {
      if (payload && payload.id) {
        const token =
          payload.exp - payload.iat > 60 * 60 * 24
            ? `refresh:${payload.id}`
            : `access:${payload.id}`;
        return token;
      }
      return 'tok_unknown';
    }),
    verifyJWTToken: jest.fn().mockImplementation(async (token: string) => {
      if (!token) return { success: false } as any;
      if (!token.includes(':') && token.startsWith('user')) {
        return { success: true, payload: { sub: token } } as any;
      }
      const [type, id] = token.split(':');
      if (type === 'user') {
        return { success: true, payload: { sub: id } } as any;
      }
      const jti = id;
      const g = grants[jti];
      if (!g) return { success: false } as any;
      const iat = Math.floor(Date.now() / 1000);
      const exp = Math.floor(new Date(g.expiryAt).getTime() / 1000);
      return {
        success: true,
        payload: {
          id: jti,
          jti,
          sub: g.userId,
          provider: g.clientId,
          aud: g.clientId,
          iat,
          exp,
        },
      };
    }),
  });

  const mockOauthGrantedTokenService = mock<OauthGrantedTokenService>({
    create: jest.fn().mockImplementation(async (data: any) => {
      const jti = `jti-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const g = {
        jti,
        userId: data.userId,
        permissionBitMask: BigInt(data.permissionBitMask),
        expiryAt: data.expiryAt,
        clientId: data.clientId,
      };
      grants[jti] = g;
      return g;
    }),
    encodeGrantedJWT: jest.fn().mockImplementation(async (granted: any) => {
      return `access:${granted.jti}`;
    }),
    findByJti: jest
      .fn()
      .mockImplementation(async (jti: string) => grants[jti] ?? null),
    deleteByJti: jest.fn().mockImplementation(async (jti: string) => {
      if (!grants[jti]) throw AppErrorCodes.JWT_STATE_NOT_FOUND;
      delete grants[jti];
    }),
    deleteByUserAndClient: jest
      .fn()
      .mockImplementation(async (userId: string, clientId: string) => {
        // Delete all grants for the given clientId regardless of the userId.
        // This simulates invalidating all authorizations for that client when
        // the owner rotates the secret or deletes the client.
        let count = 0;
        for (const k of Object.keys(grants)) {
          if (grants[k].clientId === clientId) {
            delete grants[k];
            count++;
          }
        }
        if (count === 0) throw AppErrorCodes.JWT_STATE_NOT_FOUND;
      }),
  });

  beforeAll(async () => {
    clients['test-client'] = {
      id: 'test-client',
      name: 'Test Client',
      userId: 'owner-test-client',
      secret: 'secret',
      redirectUris: ['https://app.test/callback'],
      permissionBitMask: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    clients['client-general'] = {
      id: 'client-general',
      name: 'Client General',
      userId: 'owner-client-general',
      secret: 'secret',
      redirectUris: ['https://app.test/callback'],
      permissionBitMask: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    clients['client-admin'] = {
      id: 'client-admin',
      name: 'Client Admin',
      userId: 'owner-client-admin',
      secret: 'secret',
      redirectUris: ['https://app.test/callback'],
      permissionBitMask: (1 << 0) | (1 << 3),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const moduleBuilder = Test.createTestingModule({
      controllers: [OauthController],
      providers: [
        OauthService,
        PermissionService,
        PermissionBitcalcService,
        JwtAuthGuard,
        {
          provide: AuthorizationCodeService,
          useValue: mockAuthorizationCodeService,
        },
        { provide: UserService, useValue: mockUserService },
        { provide: OauthClientService, useValue: mockOauthClientService },
        {
          provide: OauthGrantedTokenService,
          useValue: mockOauthGrantedTokenService,
        },
        { provide: JwtTokenService, useValue: mockJwtTokenService },
        { provide: AppConfigService, useValue: { get: () => ({}) } },
        {
          provide: I18nTranslateService,
          useValue: {
            text: (k: string) => k,
            scopeText: (p: string) => p,
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: async (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          const auth =
            req.headers['authorization'] || req.headers['Authorization'];
          if (!auth) throw AppErrorCodes.UNAUTHORIZED;
          const [, token] = (auth as string).split(' ');
          if (!token) throw AppErrorCodes.UNAUTHORIZED;
          const result = await mockJwtTokenService.verifyJWTToken(token);
          if (!result.success || !result.payload || !result.payload.sub)
            throw AppErrorCodes.UNAUTHORIZED;
          const exists = await mockUserService.exists(result.payload.sub);
          if (!exists) throw AppErrorCodes.UNAUTHORIZED;
          req.user = { id: result.payload.sub };
          return true;
        },
      })
      .overrideGuard(BasicOAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          const auth =
            req.headers['authorization'] || req.headers['Authorization'];
          if (!auth) return false;
          const [type, creds] = (auth as string).split(' ');
          if (type !== 'Basic' || !creds) return false;
          const decoded = Buffer.from(creds, 'base64').toString();
          const [cid, secret] = decoded.split(':');
          if (cid && clients[cid] && clients[cid].secret === secret) {
            req.client = clients[cid];
            return true;
          }
          return false;
        },
      });

    const moduleFixture: TestingModule = await moduleBuilder.compile();
    setAuthUserModuleRef(moduleFixture as any);

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new AppErrorCodeFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('redirects authenticated user to client with code (authorize)', async () => {
    const res = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .set('Authorization', 'Bearer user:user123')
      .query({
        response_type: 'code',
        client_id: 'test-client',
        redirect_uri: 'https://app.test/callback',
        scope: 'user:read user:write',
        state: 'state123',
        code_challenge: 'challenge',
        code_challenge_method: 'S256',
      });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/https:\/\/app.test\/callback/);
    expect(res.headers.location).toMatch(/code=/);
    expect(res.headers.location).toMatch(/state=state123/);
  });

  it('invalid client returns formatted error', async () => {
    const res = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .set('Authorization', 'Bearer user:user123')
      .query({
        response_type: 'code',
        client_id: 'missing-client',
        redirect_uri: 'https://app.test/callback',
        scope: 'user:read',
        state: 's',
        code_challenge: 'c',
        code_challenge_method: 'S256',
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('code', 'InvalidClient');
  });

  it('only exact registered redirect_uri allows authorization', async () => {
    const badRes = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .set('Authorization', 'Bearer user:user_exact')
      .query({
        response_type: 'code',
        client_id: 'test-client',
        redirect_uri: 'https://app.test/callback?extra=1',
        scope: 'user:read',
        state: 's',
        code_challenge: 'c',
        code_challenge_method: 'S256',
      });

    expect(badRes.status).toBe(400);
    expect(badRes.body).toHaveProperty('code', 'InvalidRedirectUri');

    const goodRes = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .set('Authorization', 'Bearer user:user_exact')
      .query({
        response_type: 'code',
        client_id: 'test-client',
        redirect_uri: 'https://app.test/callback',
        scope: 'user:read',
        state: 's',
        code_challenge: 'c',
        code_challenge_method: 'S256',
      });

    expect(goodRes.status).toBe(302);
    const code = new URL(goodRes.headers.location).searchParams.get('code');
    expect(code).toBeTruthy();
  });

  it('token fails when code_verifier is incorrect (PKCE)', async () => {
    const authRes = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .set('Authorization', 'Bearer user:pkce_user')
      .query({
        response_type: 'code',
        client_id: 'test-client',
        redirect_uri: 'https://app.test/callback',
        scope: 'user:read',
        state: 's',
        code_challenge: 'challenge',
        code_challenge_method: 'S256',
      });

    expect(authRes.status).toBe(302);
    const code = new URL(authRes.headers.location).searchParams.get('code')!;

    (
      mockAuthorizationCodeService.verifyCodeChallenge as jest.Mock
    ).mockImplementationOnce(() => false);

    const tokRes = await request(app.getHttpServer())
      .post('/oauth/token')
      .set(
        'Authorization',
        'Basic ' + Buffer.from('test-client:secret').toString('base64'),
      )
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://app.test/callback',
        code_verifier: 'wrong_verifier',
      });

    expect(tokRes.status).toBe(400);
    expect(tokRes.body).toHaveProperty('code', 'InvalidGrant');
  });

  it("general-client grants 'user:read' to general user's auth", async () => {
    const authRes = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .set('Authorization', 'Bearer user:general1')
      .query({
        response_type: 'code',
        client_id: 'client-general',
        redirect_uri: 'https://app.test/callback',
        scope: 'user:read',
        state: 's',
        code_challenge: 'c',
        code_challenge_method: 'S256',
      });

    expect(authRes.status).toBe(302);
    const code = new URL(authRes.headers.location).searchParams.get('code')!;

    const tokRes = await request(app.getHttpServer())
      .post('/oauth/token')
      .set(
        'Authorization',
        'Basic ' + Buffer.from('client-general:secret').toString('base64'),
      )
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://app.test/callback',
        code_verifier: 'v',
      });

    expect([200, 201]).toContain(tokRes.status);
    expect(tokRes.body.scope).toMatch(/user:read/);
  });

  it("admin-created client requests 'user:read admin:read' but general user only gets 'user:read'", async () => {
    const authRes = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .set('Authorization', 'Bearer user:general2')
      .query({
        response_type: 'code',
        client_id: 'client-admin',
        redirect_uri: 'https://app.test/callback',
        scope: 'user:read admin:read',
        state: 's',
        code_challenge: 'c',
        code_challenge_method: 'S256',
      });

    expect(authRes.status).toBe(302);
    const code = new URL(authRes.headers.location).searchParams.get('code')!;

    const tokRes = await request(app.getHttpServer())
      .post('/oauth/token')
      .set(
        'Authorization',
        'Basic ' + Buffer.from('client-admin:secret').toString('base64'),
      )
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://app.test/callback',
        code_verifier: 'v',
      });

    expect([200, 201]).toContain(tokRes.status);
    expect(tokRes.body.scope).toMatch(/user:read/);
    expect(tokRes.body.scope).not.toMatch(/admin:read/);
  });

  it("client created by general user requesting 'admin:read' should not grant admin even to admin authenticating", async () => {
    const authRes = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .set('Authorization', 'Bearer user:general3')
      .query({
        response_type: 'code',
        client_id: 'client-general',
        redirect_uri: 'https://app.test/callback',
        scope: 'admin:read',
        state: 's',
        code_challenge: 'c',
        code_challenge_method: 'S256',
      });

    expect(authRes.status).toBe(302);
    const code = new URL(authRes.headers.location).searchParams.get('code')!;

    const tokResGeneral = await request(app.getHttpServer())
      .post('/oauth/token')
      .set(
        'Authorization',
        'Basic ' + Buffer.from('client-general:secret').toString('base64'),
      )
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://app.test/callback',
        code_verifier: 'v',
      });

    expect([200, 201]).toContain(tokResGeneral.status);
    expect(tokResGeneral.body.scope).not.toMatch(/admin:read/);

    const authRes2 = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .set('Authorization', 'Bearer user:admin1')
      .query({
        response_type: 'code',
        client_id: 'client-general',
        redirect_uri: 'https://app.test/callback',
        scope: 'admin:read',
        state: 's',
        code_challenge: 'c',
        code_challenge_method: 'S256',
      });

    expect(authRes2.status).toBe(302);
    const code2 = new URL(authRes2.headers.location).searchParams.get('code')!;

    const tokResAdmin = await request(app.getHttpServer())
      .post('/oauth/token')
      .set(
        'Authorization',
        'Basic ' + Buffer.from('client-general:secret').toString('base64'),
      )
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code: code2,
        redirect_uri: 'https://app.test/callback',
        code_verifier: 'v',
      });

    expect([200, 201]).toContain(tokResAdmin.status);
    expect(tokResAdmin.body.scope).not.toMatch(/admin:read/);
  });

  let lastRefreshToken = '';
  let lastAccessToken = '';
  let lastJti = '';

  it('token endpoint issues access + refresh token', async () => {
    const authRes = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .set('Authorization', 'Bearer user:user_token')
      .query({
        response_type: 'code',
        client_id: 'test-client',
        redirect_uri: 'https://app.test/callback',
        scope: 'user:read user:write',
        state: 's',
        code_challenge: 'c',
        code_challenge_method: 'S256',
      });

    const location = authRes.headers.location as string;
    const code = new URL(location).searchParams.get('code')!;

    const res = await request(app.getHttpServer())
      .post('/oauth/token')
      .set(
        'Authorization',
        'Basic ' + Buffer.from('test-client:secret').toString('base64'),
      )
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://app.test/callback',
        code_verifier: 'v',
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('refresh_token');
    expect(res.body).toHaveProperty('expires_in');
    expect(res.body).toHaveProperty('scope');

    lastAccessToken = res.body.access_token;
    lastRefreshToken = res.body.refresh_token;
    lastJti = lastAccessToken.split(':')[1];
    expect(lastJti).toBeTruthy();
  });

  it('refresh token returns new tokens and invalidates old grant', async () => {
    const res = await request(app.getHttpServer())
      .post('/oauth/token')
      .set(
        'Authorization',
        'Basic ' + Buffer.from('test-client:secret').toString('base64'),
      )
      .type('form')
      .send({ grant_type: 'refresh_token', refresh_token: lastRefreshToken });

    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('refresh_token');

    expect(grants[lastJti]).toBeUndefined();

    lastAccessToken = res.body.access_token;
    lastRefreshToken = res.body.refresh_token;
  });

  it('reusing the same refresh token fails', async () => {
    const first = await request(app.getHttpServer())
      .post('/oauth/token')
      .set(
        'Authorization',
        'Basic ' + Buffer.from('test-client:secret').toString('base64'),
      )
      .type('form')
      .send({ grant_type: 'refresh_token', refresh_token: lastRefreshToken });

    const second = await request(app.getHttpServer())
      .post('/oauth/token')
      .set(
        'Authorization',
        'Basic ' + Buffer.from('test-client:secret').toString('base64'),
      )
      .type('form')
      .send({ grant_type: 'refresh_token', refresh_token: lastRefreshToken });

    expect([200, 201]).toContain(first.status);
    expect(second.status).toBe(400);
    expect(second.body).toHaveProperty('code', 'InvalidGrant');
  });

  it('revoke client unlink and subsequent access is denied', async () => {
    const authRes = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .set('Authorization', 'Bearer user:user_revoke')
      .query({
        response_type: 'code',
        client_id: 'test-client',
        redirect_uri: 'https://app.test/callback',
        scope: 'user:read',
        state: 's',
        code_challenge: 'c',
        code_challenge_method: 'S256',
      });

    const code = new URL(authRes.headers.location).searchParams.get('code')!;
    const tokRes = await request(app.getHttpServer())
      .post('/oauth/token')
      .set(
        'Authorization',
        'Basic ' + Buffer.from('test-client:secret').toString('base64'),
      )
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://app.test/callback',
        code_verifier: 'v',
      });

    const access = tokRes.body.access_token;

    const revokeRes = await request(app.getHttpServer())
      .post('/oauth/token/revoke')
      .set('Authorization', 'Bearer user_revoke')
      .type('form')
      .send({
        client_id: 'test-client',
        token: access,
        client_secret: 'secret',
      });

    expect([200, 201]).toContain(revokeRes.status);

    const protectedRes = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .set('Authorization', `Bearer ${access}`);

    expect([401, 400]).toContain(protectedRes.status);
  });

  it('owner rotating secret invalidates other user access', async () => {
    // victim obtains a token from the client owned by owner-test-client
    const authRes = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .set('Authorization', 'Bearer user:victim')
      .query({
        response_type: 'code',
        client_id: 'test-client',
        redirect_uri: 'https://app.test/callback',
        scope: 'user:read',
        state: 's',
        code_challenge: 'c',
        code_challenge_method: 'S256',
      });

    expect(authRes.status).toBe(302);
    const code = new URL(authRes.headers.location).searchParams.get('code')!;

    const tokRes = await request(app.getHttpServer())
      .post('/oauth/token')
      .set(
        'Authorization',
        'Basic ' + Buffer.from('test-client:secret').toString('base64'),
      )
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://app.test/callback',
        code_verifier: 'v',
      });

    expect([200, 201]).toContain(tokRes.status);
    const access = tokRes.body.access_token;

    // access should work before rotation
    const before = await request(app.getHttpServer())
      .get('/oauth/userinfo')
      .set('Authorization', `Bearer ${access}`);
    expect(before.status).toBe(200);

    // owner rotates secret -> call regen endpoint as owner
    const regenRes = await request(app.getHttpServer())
      .post('/oauth/client/regenerate-secret')
      .set('Authorization', 'Bearer user:owner-test-client')
      .send({ clientId: 'test-client' });

    expect([200, 201]).toContain(regenRes.status);

    // previous access should now be invalid
    const after = await request(app.getHttpServer())
      .get('/oauth/userinfo')
      .set('Authorization', `Bearer ${access}`);
    expect([401, 400]).toContain(after.status);
  });

  it('owner deleting client invalidates other user access', async () => {
    // victim obtains a token again
    const authRes = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .set('Authorization', 'Bearer user:victim2')
      .query({
        response_type: 'code',
        client_id: 'test-client',
        redirect_uri: 'https://app.test/callback',
        scope: 'user:read',
        state: 's',
        code_challenge: 'c',
        code_challenge_method: 'S256',
      });

    expect(authRes.status).toBe(302);
    const code = new URL(authRes.headers.location).searchParams.get('code')!;

    const tokRes = await request(app.getHttpServer())
      .post('/oauth/token')
      .set(
        'Authorization',
        'Basic ' + Buffer.from('test-client:secret').toString('base64'),
      )
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://app.test/callback',
        code_verifier: 'v',
      });

    expect([200, 201]).toContain(tokRes.status);
    const access = tokRes.body.access_token;

    // verify access works
    const before = await request(app.getHttpServer())
      .get('/oauth/userinfo')
      .set('Authorization', `Bearer ${access}`);
    expect(before.status).toBe(200);

    // owner deletes client
    const delRes = await request(app.getHttpServer())
      .delete('/oauth/client')
      .set('Authorization', 'Bearer user:owner-test-client')
      .send({ id: 'test-client' });

    expect([200, 201]).toContain(delRes.status);

    // previous access should now be invalid
    const after = await request(app.getHttpServer())
      .get('/oauth/userinfo')
      .set('Authorization', `Bearer ${access}`);
    expect([401, 400]).toContain(after.status);
  });

  // OIDC scope tests
  it('grants openid scope and returns it in token response', async () => {
    const authRes = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .set('Authorization', 'Bearer user:openid_user')
      .query({
        response_type: 'code',
        client_id: 'test-client',
        redirect_uri: 'https://app.test/callback',
        scope: 'openid',
        state: 's',
        code_challenge: 'c',
        code_challenge_method: 'S256',
      });

    expect(authRes.status).toBe(302);
    const code = new URL(authRes.headers.location).searchParams.get('code')!;

    const tokRes = await request(app.getHttpServer())
      .post('/oauth/token')
      .set(
        'Authorization',
        'Basic ' + Buffer.from('test-client:secret').toString('base64'),
      )
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://app.test/callback',
        code_verifier: 'v',
      });

    expect([200, 201]).toContain(tokRes.status);
    expect(tokRes.body.scope).toMatch(/openid/);
  });

  it('grants profile scope and returns it in token response', async () => {
    const authRes = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .set('Authorization', 'Bearer user:profile_user')
      .query({
        response_type: 'code',
        client_id: 'test-client',
        redirect_uri: 'https://app.test/callback',
        scope: 'profile',
        state: 's',
        code_challenge: 'c',
        code_challenge_method: 'S256',
      });

    expect(authRes.status).toBe(302);
    const code = new URL(authRes.headers.location).searchParams.get('code')!;

    const tokRes = await request(app.getHttpServer())
      .post('/oauth/token')
      .set(
        'Authorization',
        'Basic ' + Buffer.from('test-client:secret').toString('base64'),
      )
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://app.test/callback',
        code_verifier: 'v',
      });

    expect([200, 201]).toContain(tokRes.status);
    expect(tokRes.body.scope).toMatch(/profile/);
  });

  it('grants email scope and returns it in token response', async () => {
    const authRes = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .set('Authorization', 'Bearer user:email_user')
      .query({
        response_type: 'code',
        client_id: 'test-client',
        redirect_uri: 'https://app.test/callback',
        scope: 'email',
        state: 's',
        code_challenge: 'c',
        code_challenge_method: 'S256',
      });

    expect(authRes.status).toBe(302);
    const code = new URL(authRes.headers.location).searchParams.get('code')!;

    const tokRes = await request(app.getHttpServer())
      .post('/oauth/token')
      .set(
        'Authorization',
        'Basic ' + Buffer.from('test-client:secret').toString('base64'),
      )
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://app.test/callback',
        code_verifier: 'v',
      });

    expect([200, 201]).toContain(tokRes.status);
    expect(tokRes.body.scope).toMatch(/email/);
  });

  it('grants address scope and returns it in token response', async () => {
    const authRes = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .set('Authorization', 'Bearer user:address_user')
      .query({
        response_type: 'code',
        client_id: 'test-client',
        redirect_uri: 'https://app.test/callback',
        scope: 'address',
        state: 's',
        code_challenge: 'c',
        code_challenge_method: 'S256',
      });

    expect(authRes.status).toBe(302);
    const code = new URL(authRes.headers.location).searchParams.get('code')!;

    const tokRes = await request(app.getHttpServer())
      .post('/oauth/token')
      .set(
        'Authorization',
        'Basic ' + Buffer.from('test-client:secret').toString('base64'),
      )
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://app.test/callback',
        code_verifier: 'v',
      });

    expect([200, 201]).toContain(tokRes.status);
    expect(tokRes.body.scope).toMatch(/address/);
  });

  it('grants phone scope and returns it in token response', async () => {
    const authRes = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .set('Authorization', 'Bearer user:phone_user')
      .query({
        response_type: 'code',
        client_id: 'test-client',
        redirect_uri: 'https://app.test/callback',
        scope: 'phone',
        state: 's',
        code_challenge: 'c',
        code_challenge_method: 'S256',
      });

    expect(authRes.status).toBe(302);
    const code = new URL(authRes.headers.location).searchParams.get('code')!;

    const tokRes = await request(app.getHttpServer())
      .post('/oauth/token')
      .set(
        'Authorization',
        'Basic ' + Buffer.from('test-client:secret').toString('base64'),
      )
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://app.test/callback',
        code_verifier: 'v',
      });

    expect([200, 201]).toContain(tokRes.status);
    expect(tokRes.body.scope).toMatch(/phone/);
  });
});
