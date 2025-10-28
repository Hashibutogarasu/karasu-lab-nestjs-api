import { Test, TestingModule } from '@nestjs/testing';
import { AccountPictureService } from './picture.service';
import { mock } from 'jest-mock-extended';
import { R2Service } from '../../cloudflare/r2/r2.service';

describe('AccountPictureService', () => {
  let service: AccountPictureService;

  beforeEach(async () => {
    const mockR2Service = mock<R2Service>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountPictureService,
        { provide: R2Service, useValue: mockR2Service },
      ],
    }).compile();

    service = module.get<AccountPictureService>(AccountPictureService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
