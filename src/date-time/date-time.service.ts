import { Injectable } from '@nestjs/common';

@Injectable()
export class DateTimeService {
  now(): bigint {
    return BigInt(Date.now());
  }

  toIsoDatetime(ts: bigint): string {
    return new Date(Number(ts)).toISOString();
  }

  toIsoDatetimeFromDate(d: Date): string {
    return d.toISOString();
  }
}
