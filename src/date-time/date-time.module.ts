import { Module } from '@nestjs/common';
import { DateTimeService } from './date-time.service';

@Module({
  providers: [DateTimeService],
})
export class DateTimeModule {}
