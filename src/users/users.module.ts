import { Global, Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { AuthModule } from '../auth/auth.module';
import { DataBaseModule } from '../data-base/data-base.module';

@Module({
  imports: [AuthModule, DataBaseModule],
  controllers: [UsersController],
  providers: [],
  exports: [],
})
@Global()
export class UsersModule {}
