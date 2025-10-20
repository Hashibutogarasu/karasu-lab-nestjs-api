import { Module } from '@nestjs/common';
import { MfaService } from './mfa.service';
import { TotpModule } from '../totp/totp.module';
import { EncryptionModule } from '../encryption/encryption.module';

@Module({
  imports: [TotpModule, EncryptionModule],
  providers: [MfaService],
  exports: [MfaService],
})
export class MfaModule {}
