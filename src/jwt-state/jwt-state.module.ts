import { Module } from '@nestjs/common';
import { JwtStateService } from './jwt-state.service';
import { JwtStateController } from './jwt-state.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [JwtStateController],
  providers: [JwtStateService],
})
export class JwtStateModule {}
