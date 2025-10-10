import { Module } from '@nestjs/common';
import { CoinController } from './coin.controller';
import { CoinService } from './coin.service';
import { AuthModule } from '../../auth/auth.module';
import { GmoCoinCronService } from './cron/gmo-coin-cron.service';
@Module({
  imports: [AuthModule],
  controllers: [CoinController],
  providers: [CoinService, GmoCoinCronService],
})
export class CoinModule {}
