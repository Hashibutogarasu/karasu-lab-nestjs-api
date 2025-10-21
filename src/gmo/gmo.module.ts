import { Module } from '@nestjs/common';
import { CoinModule } from './coin/coin.module';
import { AuthModule } from '../auth/auth.module';
import { DataBaseModule } from '../data-base/data-base.module';

@Module({
  imports: [CoinModule, AuthModule, DataBaseModule],
})
export class GmoModule {}
