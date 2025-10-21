import { Test, TestingModule } from '@nestjs/testing';
import { ExternalProviderAccessTokenService } from './external-provider-access-token.service';
import { DataBaseModule } from '../../data-base.module';
import { mock } from 'jest-mock-extended';
import { DataBaseService } from '../../data-base.service';
import { EncryptionService } from '../../../encryption/encryption.service';

describe('ExternalProviderAccessTokenService', () => {
  let service: ExternalProviderAccessTokenService;

  beforeEach(async () => {
    const mockDatabaseService = mock<DataBaseService>();
    const mockEncryptionService = mock<EncryptionService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalProviderAccessTokenService,
        {
          provide: DataBaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
      ],
    }).compile();

    service = module.get<ExternalProviderAccessTokenService>(
      ExternalProviderAccessTokenService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
