import { Test, TestingModule } from '@nestjs/testing';
import { OauthController } from './oauth.controller';
import { mock } from 'jest-mock-extended';
import { OauthService } from './oauth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BasicOAuthGuard } from './basic/basic.guard';

describe('OauthController', () => {
  let controller: OauthController;

  beforeEach(async () => {
    const mockoAuthService = mock<OauthService>();

    const moduleBuilder = Test.createTestingModule({
      controllers: [OauthController],
      providers: [
        {
          provide: OauthService,
          useValue: mockoAuthService,
        },
      ],
    });

    const mockJwtAuthGuard = mock<JwtAuthGuard>();
    const mockBasicOAuthGuard = mock<BasicOAuthGuard>();

    moduleBuilder.overrideGuard(JwtAuthGuard).useValue(mockJwtAuthGuard);
    moduleBuilder.overrideGuard(BasicOAuthGuard).useValue(mockBasicOAuthGuard);

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<OauthController>(OauthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
