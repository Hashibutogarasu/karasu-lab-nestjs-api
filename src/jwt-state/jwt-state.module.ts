import { Module, forwardRef } from '@nestjs/common';
import { JwtStateController } from './jwt-state.controller';
import { AuthModule } from '../auth/auth.module';
import { DataBaseModule } from '../data-base/data-base.module';

@Module({
  imports: [forwardRef(() => AuthModule), DataBaseModule],
  controllers: [JwtStateController],
  providers: [],
})
export class JwtStateModule {}
