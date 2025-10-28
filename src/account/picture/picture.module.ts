import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AccountPictureService } from './picture.service';
import { R2Service } from '../../cloudflare/r2/r2.service';

@Module({
  imports: [AuthModule],
  providers: [AccountPictureService, R2Service],
  controllers: [],
})
export class PictureModule {}
