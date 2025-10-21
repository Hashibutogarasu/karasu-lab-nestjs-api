import { Module } from '@nestjs/common';
import { TotpModule } from '../totp/totp.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { MfaService } from '../data-base/query/mfa/mfa.service';

@Module({
  imports: [TotpModule, EncryptionModule],
  providers: [MfaService],
  exports: [MfaService],
})
export class MfaModule {}
