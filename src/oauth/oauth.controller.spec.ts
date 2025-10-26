import { Test, TestingModule } from '@nestjs/testing';
import { OauthController } from './oauth.controller';
import { mock } from 'jest-mock-extended';
import { OauthService } from './oauth.service';

describe('OauthController', () => {
  let controller: OauthController;

  beforeEach(async () => {
    const mockoAuthService = mock<OauthService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OauthController],
      providers: [
        {
          provide: OauthService,
          useValue: mockoAuthService,
        },
      ],
    }).compile();

    controller = module.get<OauthController>(OauthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
