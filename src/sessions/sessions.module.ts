import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { DataBaseModule } from '../data-base/data-base.module';

@Module({
  imports: [DataBaseModule],
  controllers: [SessionsController],
})
export class SessionsModule {}
