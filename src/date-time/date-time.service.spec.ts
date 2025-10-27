import { Test, TestingModule } from '@nestjs/testing';
import { DateTimeService } from './date-time.service';
import { z } from 'zod';

describe('DateTimeService', () => {
  let service: DateTimeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DateTimeService],
    }).compile();

    service = module.get<DateTimeService>(DateTimeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('now() returns bigint UTC milliseconds close to Date.now()', () => {
    const ts = service.now();
    const nowMs = BigInt(Date.now());
    const diff = nowMs > ts ? nowMs - ts : ts - nowMs;
    expect(Number(diff)).toBeLessThanOrEqual(10);
  });

  it('toIsoDatetime converts bigint to ISO datetime accepted by z.string().datetime()', () => {
    const ts = service.now();
    const iso = service.toIsoDatetime(ts);
    expect(iso).toBe(new Date(Number(ts)).toISOString());
    const result = z.string().datetime().safeParse(iso);
    expect(result.success).toBe(true);
  });

  it('toIsoDatetimeFromDate converts Date to ISO datetime accepted by z.string().datetime()', () => {
    const ts = service.now();
    const d = new Date(Number(ts));
    const iso = service.toIsoDatetimeFromDate(d);
    expect(iso).toBe(d.toISOString());
    const result = z.iso.datetime().safeParse(iso);
    expect(result.success).toBe(true);
  });
});
