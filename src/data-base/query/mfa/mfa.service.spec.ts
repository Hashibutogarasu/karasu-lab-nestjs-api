import { Test, TestingModule } from '@nestjs/testing';
import { MfaService } from './mfa.service';
import { DataBaseModule } from '../../data-base.module';
import { mock } from 'jest-mock-extended';
import { DataBaseService } from '../../data-base.service';
import { UtilityService } from '../../utility/utility.service';
import { EncryptionService } from '../../../encryption/encryption.service';
import { TotpService } from '../../../totp/totp.service';

describe('MfaService', () => {
  let service: MfaService;

  beforeEach(async () => {
    const mockDatabaseService = mock<DataBaseService>();
    const mockUtilityService = mock<UtilityService>();
    const mockEncryptionService = mock<EncryptionService>();
    const mockTotpService = mock<TotpService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        {
          provide: DataBaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: UtilityService,
          useValue: mockUtilityService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
        {
          provide: TotpService,
          useValue: mockTotpService,
        },
      ],
    }).compile();

    service = module.get<MfaService>(MfaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
