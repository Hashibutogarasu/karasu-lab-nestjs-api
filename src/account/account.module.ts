import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { ResendService } from '../resend/resend.service';
import { PendingEmailChangeProcessService } from '../data-base/query/pending-email-change-process/pending-email-change-process.service';
import { PictureModule } from './picture/picture.module';

@Module({
  imports: [PictureModule],
  controllers: [AccountController],
  providers: [AccountService, ResendService, PendingEmailChangeProcessService],
})
export class AccountModule {}
