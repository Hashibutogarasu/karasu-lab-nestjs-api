import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Global Response Formatter & NoInterceptor (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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
  });

  it('GET /raw-ping (@NoInterceptor) should NOT be formatted', async () => {
    const res = await request(app.getHttpServer()).get('/raw-ping').expect(200);

    // raw body without wrapping
    expect(res.body).toEqual({ ping: true });
  });
});
