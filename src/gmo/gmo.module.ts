import { Module } from '@nestjs/common';
import { CoinModule } from './coin/coin.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CoinModule, AuthModule],
})
export class GmoModule {}
