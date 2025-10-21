import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { ResendService } from '../resend/resend.service';
import { AuthModule } from '../auth/auth.module';
import { PendingEmailChangeProcessService } from '../data-base/query/pending-email-change-process/pending-email-change-process.service';

@Module({
  imports: [],
  controllers: [AccountController],
  providers: [AccountService, ResendService, PendingEmailChangeProcessService],
})
export class AccountModule {}
