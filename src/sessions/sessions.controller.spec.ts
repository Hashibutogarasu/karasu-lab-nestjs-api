import { Test, TestingModule } from '@nestjs/testing';
import { SessionsController } from './sessions.controller';
import { mock } from 'jest-mock-extended';
import { SessionService } from '../data-base/query/session/session.service';
import { DataBaseService } from '../data-base/data-base.service';
import { JwtTokenService } from '../auth/jwt-token/jwt-token.service';

describe('SessionsController', () => {
  let controller: SessionsController;

  beforeEach(async () => {
    const mockDataBaseService = mock<DataBaseService>();
    const mockSessionService = mock<SessionService>();
    const mockJwtTokenService = mock<JwtTokenService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [
        {
          provide: DataBaseService,
          useValue: mockDataBaseService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: JwtTokenService,
          useValue: mockJwtTokenService,
        },
      ],
    }).compile();

    controller = module.get<SessionsController>(SessionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
