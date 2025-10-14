import { Module } from '@nestjs/common';
import { DeveloperService } from './developer.service';
import { DeveloperController } from './developer.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersService } from '../users/users.service';

@Module({
  imports: [AuthModule],
  controllers: [DeveloperController],
  providers: [DeveloperService, UsersService],
})
export class DeveloperModule {}
