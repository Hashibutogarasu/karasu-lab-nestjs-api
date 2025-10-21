import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DifyController } from './dify.controller';
import { DifyService } from './dify.service';
import { AuthModule } from '../auth/auth.module';
import { DomainModule } from '../lib/domain';

@Module({
  imports: [
    DomainModule.forRoot({
      allowedDomains: [process.env.PRIVATE_DOMAIN!],
    }),
  ],
  controllers: [DifyController],
  providers: [DifyService],
})
export class DifyModule {}
