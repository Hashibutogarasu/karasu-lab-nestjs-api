import { Module } from '@nestjs/common';
import { CoinModule } from './coin/coin.module';

@Module({
  imports: [CoinModule],
})
export class GmoModule {}
