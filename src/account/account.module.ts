import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { ResendService } from '../resend/resend.service';

@Module({
  controllers: [AccountController],
  providers: [AccountService, ResendService],
})
export class AccountModule {}
