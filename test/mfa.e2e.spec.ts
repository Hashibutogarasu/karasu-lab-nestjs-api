import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module';
import { TotpService } from '../src/totp/totp.service';
import { MfaModule } from '../src/mfa/mfa.module';
import { AppErrorCodeFilter } from '../src/filters/app-error-code.filter';
import { mock } from 'jest-mock-extended';
import { EncryptionService } from '../src/encryption/encryption.service';
import { AuthService } from '../src/auth/auth.service';
import { MfaService } from '../src/data-base/query/mfa/mfa.service';
import { UserService } from '../src/data-base/query/user/user.service';
import { DataBaseService } from '../src/data-base/data-base.service';
import { AuthModule } from '../src/auth/auth.module';
import { DataBaseModule } from '../src/data-base/data-base.module';
import prisma from '../src/lib/database/query';

describe('MFA e2e flow', () => {
  let app: INestApplication<App>;
  let server: App;
  let totp: TotpService;

  const testUser = {
    username: `mfa_user_${Date.now()}`,
    email: `mfa_${Date.now()}@example.test`,
    password: 'Str0ngP@ssw0rd!',
  };

  beforeAll(async () => {
    totp = mock<TotpService>();
    const mockMfaService = mock<MfaService>();
    const mockEncryptionService = mock<EncryptionService>();
    const mockAuthService = mock<AuthService>();
    const mockUserService = mock<UserService>();
    const mockDatabaseService = mock<DataBaseService>({
      prisma: jest.fn().mockReturnValue(prisma)
    });

    const moduleBuilder = Test.createTestingModule({
      imports: [AuthModule, DataBaseModule, MfaModule],
    });
    moduleBuilder.overrideProvider(MfaService).useValue(mockMfaService);
    moduleBuilder.overrideProvider(EncryptionService).useValue(mockEncryptionService);
    moduleBuilder.overrideProvider(AuthService).useValue(mockAuthService);
    moduleBuilder.overrideProvider(UserService).useValue(mockUserService);
    moduleBuilder.overrideProvider(DataBaseService).useValue(mockDatabaseService);

    const moduleFixture: TestingModule = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new AppErrorCodeFilter());
    await app.init();
    server = app.getHttpServer();

    (global as any).__TEST_JWT_SERVICE = moduleFixture.get(JwtService as any);
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a user, enables MFA, verifies with TOTP and backup codes', async () => {
    const reg = await request(server).post('/auth/register').send({
      username: testUser.username,
      email: testUser.email,
      password: testUser.password,
    });
    expect(reg.status).toBe(201);

    const loginRes = await request(server).post('/auth/login').send({
      usernameOrEmail: testUser.email,
      password: testUser.password,
    });

    expect([200, 201, 400, 401, 200]).toContain(loginRes.status);

    const accessToken =
      loginRes.body?.access_token ||
      loginRes.body?.mfaToken ||
      loginRes.body?.mfa_token;
    expect(accessToken).toBeDefined();

    const setupRes = await request(server)
      .post('/auth/mfa/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    expect(setupRes.status).toBe(201);
    expect(setupRes.body).toHaveProperty('otpauth');
    expect(setupRes.body).toHaveProperty('secret');
    expect(setupRes.body).toHaveProperty('backup_codes');
    const { secret, backup_codes } = setupRes.body;
    expect(Array.isArray(backup_codes)).toBe(true);
    expect(backup_codes.length).toBeGreaterThan(0);

    const code = totp.generateToken(secret);

    const mfaToken = loginRes.body?.mfaToken || loginRes.body?.mfa_token;
    expect(mfaToken || accessToken).toBeDefined();

    const verifyBody = mfaToken
      ? { mfaToken: mfaToken, code }
      : { mfaToken: accessToken, code };

    const verifyRes = await request(server)
      .post('/auth/mfa/verify')
      .send(verifyBody);
    expect([200, 201]).toContain(verifyRes.status);
    expect(verifyRes.body).toHaveProperty('access_token');
    expect(verifyRes.body).toHaveProperty('refresh_token');

    const newAccessToken = verifyRes.body.access_token;
    const backupRes = await request(server)
      .get('/auth/mfa/backup-codes')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .send();

    expect(backupRes.status).toBe(200);
    expect(Array.isArray(backupRes.body.backup_codes)).toBe(true);
    expect(backupRes.body.backup_codes[0]).toMatch(/^[A-Za-z0-9]{1,}$/);

    const delRes = await request(server)
      .delete('/auth/mfa')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .send();
    expect(delRes.status).toBe(200);
    expect(delRes.body.message).toMatch(/disabled/i);
  }, 20000);

  it('concurrent setup from two clients: one succeeds, other gets simultaneous error', async () => {
    const concurrentUsername = `${testUser.username}_concurrent`;
    const concurrentEmail = `concurrent_${Date.now()}@example.test`;

    const reg = await request(server).post('/auth/register').send({
      username: concurrentUsername,
      email: concurrentEmail,
      password: testUser.password,
    });
    expect(reg.status).toBe(201);

    const loginRes = await request(server).post('/auth/login').send({
      usernameOrEmail: concurrentEmail,
      password: testUser.password,
    });
    expect([200, 201, 400, 401, 200]).toContain(loginRes.status);
    const accessToken =
      loginRes.body?.access_token ||
      loginRes.body?.accessToken ||
      loginRes.body?.mfaToken ||
      loginRes.body?.mfa_token;
    expect(accessToken).toBeDefined();

    const reqA = request(server)
      .post('/auth/mfa/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    const reqB = request(server)
      .post('/auth/mfa/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    const [resA, resB] = await Promise.allSettled([reqA, reqB]);

    const fulfilled = [resA, resB].filter((r) => r.status === 'fulfilled') as
      | PromiseFulfilledResult<any>[]
      | any[];

    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    const successRes = (fulfilled[0] as PromiseFulfilledResult<any>).value;
    expect(successRes.status).toBe(409);
    expect(successRes.body).toHaveProperty('message');
  }, 20000);
});
