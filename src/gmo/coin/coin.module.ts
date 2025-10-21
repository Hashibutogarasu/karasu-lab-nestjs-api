import { Module } from '@nestjs/common';
import { CoinController } from './coin.controller';
import { CoinService } from './coin.service';
import { AuthModule } from '../../auth/auth.module';
import { GmoCoinCronService } from './cron/gmo-coin-cron.service';
import { DataBaseModule } from '../../data-base/data-base.module';
@Module({
  imports: [AuthModule, DataBaseModule],
  controllers: [CoinController],
  providers: [CoinService, GmoCoinCronService],
})
export class CoinModule {}
