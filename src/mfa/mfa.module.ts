import { Module } from '@nestjs/common';
import { TotpModule } from '../totp/totp.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { MfaService } from '../data-base/query/mfa/mfa.service';
import { DateTimeModule } from '../date-time/date-time.module';
import { ConfigModule } from '@nestjs/config';
import { DateTimeService } from '../date-time/date-time.service';

@Module({
  imports: [TotpModule, EncryptionModule, DateTimeModule, ConfigModule],
  providers: [MfaService, DateTimeService],
  exports: [MfaService],
})
export class MfaModule {}
