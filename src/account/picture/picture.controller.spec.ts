import { Test, TestingModule } from '@nestjs/testing';
import { PictureController } from './picture.controller';
import { mock } from 'jest-mock-extended';
import { AccountPictureService } from './picture.service';
import { JwtTokenService } from '../../auth/jwt-token/jwt-token.service';

describe('PictureController', () => {
  let controller: PictureController;

  beforeEach(async () => {
    const mockAccountPictureService = mock<AccountPictureService>();
    const mockJwtTokenService = mock<JwtTokenService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PictureController],
      providers: [
        {
          provide: AccountPictureService,
          useValue: mockAccountPictureService,
        },
        {
          provide: JwtTokenService,
          useValue: mockJwtTokenService,
        },
      ],
    }).compile();

    controller = module.get<PictureController>(PictureController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
