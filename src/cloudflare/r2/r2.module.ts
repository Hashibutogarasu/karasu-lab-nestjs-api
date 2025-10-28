import { Module } from '@nestjs/common';
import { R2Service } from './r2.service';
import { AppConfigModule } from '../../app-config/app-config.module';

@Module({
  imports: [AppConfigModule],
  providers: [R2Service],
})
export class R2Module {}
