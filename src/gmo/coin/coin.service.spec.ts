import { Test, TestingModule } from '@nestjs/testing';
import { CoinService } from './coin.service';
import { PriceType, Interval } from './dto/gmo-coin-request.dto';
import { AppErrorCodes } from '../../types/error-codes';
import fetchJson from '../../utils/network-utils';
import { mock } from 'jest-mock-extended';
import { GmocoinService } from '../../data-base/query/gmocoin/gmocoin.service';
import { DataBaseService } from '../../data-base/data-base.service';
import { UtilityService } from '../../data-base/utility/utility.service';
import { RoleService } from '../../data-base/query/role/role.service';
import { JwtTokenService } from '../../auth/jwt-token/jwt-token.service';
import prisma from '../../lib/database/query';

// Mock fetchJson helper instead of global.fetch to avoid changing network-utils
jest.mock('../../utils/network-utils', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('CoinService', () => {
  let service: CoinService;
  let mockGmoCoinService: GmocoinService;

  beforeEach(async () => {
    mockGmoCoinService = mock<GmocoinService>();
    const mockDatabaseService = mock<DataBaseService>({
      prisma: jest.fn().mockResolvedValue(prisma),
    });
    const mockUtilityService = mock<UtilityService>();
    const mockRoleService = mock<RoleService>();
    const mockJwtTokenService = mock<JwtTokenService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoinService,
        {
          provide: GmocoinService,
          useValue: mockGmoCoinService,
        },
        {
          provide: DataBaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: UtilityService,
          useValue: mockUtilityService,
        },
        {
          provide: RoleService,
          useValue: mockRoleService,
        },
        {
          provide: JwtTokenService,
          useValue: mockJwtTokenService,
        },
      ],
    }).compile();

    service = module.get<CoinService>(CoinService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStatus', () => {
    it('should fetch and return status data', async () => {
      const mockResponse = {
        status: 0,
        data: { status: 'OPEN' },
        responsetime: '2025-10-10T02:45:39.342Z',
      };

      (fetchJson as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await service.getStatus();

      expect(fetchJson).toHaveBeenCalledWith(
        'https://forex-api.coin.z.com/public/v1/status',
        {},
        expect.any(Object),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should return cached status when cache=true and DB has entry', async () => {
      const dbEntry = {
        statusCode: 0,
        data: { status: 'OPEN' },
        responsetime: new Date('2025-10-10T02:45:39.342Z'),
      };

      (
        mockGmoCoinService.getLatestGmoCoinStatus as jest.Mock
      ).mockResolvedValueOnce(dbEntry);

      const result = await service.getStatus({
        cache: true,
        updateDb: false,
      } as any);
      expect(result).toEqual({
        status: 0,
        data: { status: 'OPEN' },
        responsetime: '2025-10-10T02:45:39.342Z',
      });
    });

    it('should throw NotFoundException when cache=true and DB empty', async () => {
      (
        mockGmoCoinService.getLatestGmoCoinStatus as jest.Mock
      ).mockResolvedValueOnce(null);

      await expect(
        service.getStatus({ cache: true, updateDb: false } as any),
      ).rejects.toThrow(AppErrorCodes.EXTERNAL_API_REQUEST_FAILED);
    });
    it('should throw AppErrorCode on error', async () => {
      (fetchJson as jest.Mock).mockRejectedValueOnce(
        AppErrorCodes.EXTERNAL_API_REQUEST_FAILED,
      );

      await expect(service.getStatus()).rejects.toThrow(
        AppErrorCodes.EXTERNAL_API_REQUEST_FAILED,
      );
    });
  });

  describe('getTicker', () => {
    it('should fetch and return ticker data', async () => {
      const mockResponse = {
        status: 0,
        data: [
          {
            symbol: 'USD_JPY',
            ask: '152.956',
            bid: '152.952',
            timestamp: '2025-10-10T02:47:35.951Z',
            status: 'OPEN',
          },
        ],
        responsetime: '2025-10-10T02:47:36.025Z',
      };

      (fetchJson as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await service.getTicker();

      expect(fetchJson).toHaveBeenCalledWith(
        'https://forex-api.coin.z.com/public/v1/ticker',
        {},
        expect.any(Object),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw AppErrorCode on error', async () => {
      (fetchJson as jest.Mock).mockRejectedValueOnce(
        AppErrorCodes.EXTERNAL_API_REQUEST_FAILED,
      );

      await expect(service.getTicker()).rejects.toThrow(
        AppErrorCodes.EXTERNAL_API_REQUEST_FAILED,
      );
    });

    it('should return cached ticker when cache=true and DB has entry', async () => {
      const dbEntry = {
        statusCode: 0,
        responsetime: new Date('2025-10-10T02:47:36.025Z'),
        data: [
          {
            symbol: 'USD_JPY',
            ask: '152.956',
            bid: '152.952',
            timestamp: new Date('2025-10-10T02:47:35.951Z'),
            status: 'OPEN',
          },
        ],
      };

      (
        mockGmoCoinService.getLatestGmoCoinTicker as jest.Mock
      ).mockResolvedValueOnce(dbEntry);

      const result = await service.getTicker({
        cache: true,
        updateDb: false,
      } as any);
      expect(result).toEqual({
        status: 0,
        data: [
          {
            symbol: 'USD_JPY',
            ask: '152.956',
            bid: '152.952',
            timestamp: '2025-10-10T02:47:35.951Z',
            status: 'OPEN',
          },
        ],
        responsetime: '2025-10-10T02:47:36.025Z',
      });
    });

    it('should throw NotFoundException when ticker cache requested but DB empty', async () => {
      (
        mockGmoCoinService.getLatestGmoCoinTicker as jest.Mock
      ).mockResolvedValueOnce(null);

      await expect(
        service.getTicker({ cache: true, updateDb: false } as any),
      ).rejects.toThrow(AppErrorCodes.EXTERNAL_API_REQUEST_FAILED);
    });
  });

  describe('getKline', () => {
    it('should fetch and return kline data with correct query parameters', async () => {
      const mockResponse = {
        status: 0,
        data: [
          {
            openTime: '2025-10-10T00:00:00.000Z',
            open: '152.950',
            high: '152.960',
            low: '152.940',
            close: '152.955',
          },
        ],
        responsetime: '2025-10-10T02:50:00.000Z',
      };

      (fetchJson as jest.Mock).mockResolvedValueOnce(mockResponse);

      const params = {
        symbol: 'USD_JPY',
        priceType: PriceType.ASK,
        interval: Interval.ONE_MIN,
        date: '20251010',
      };

      const result = await service.getKline(params);

      expect(fetchJson).toHaveBeenCalledWith(
        'https://forex-api.coin.z.com/public/v1/klines?symbol=USD_JPY&priceType=ASK&interval=1min&date=20251010',
        {},
        expect.any(Object),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw HttpException on error', async () => {
      (fetchJson as jest.Mock).mockRejectedValueOnce(
        AppErrorCodes.EXTERNAL_API_REQUEST_FAILED,
      );

      const params = {
        symbol: 'USD_JPY',
        priceType: PriceType.ASK,
        interval: Interval.ONE_MIN,
        date: '20251010',
      };

      await expect(service.getKline(params)).rejects.toThrow(
        AppErrorCodes.EXTERNAL_API_REQUEST_FAILED,
      );
    });

    it('should return cached kline when cache=true and DB has entry', async () => {
      const dbEntry = {
        statusCode: 0,
        responsetime: new Date('2025-10-10T02:50:00.000Z'),
        data: [
          {
            openTime: new Date('2025-10-10T00:00:00.000Z'),
            open: '152.950',
            high: '152.960',
            low: '152.940',
            close: '152.955',
          },
        ],
      };

      (
        mockGmoCoinService.getLatestGmoCoinKline as jest.Mock
      ).mockResolvedValueOnce(dbEntry);

      const params = {
        symbol: 'USD_JPY',
        priceType: PriceType.ASK,
        interval: Interval.ONE_MIN,
        date: '20251010',
      };

      const result = await service.getKline(
        params as any,
        { cache: true, updateDb: false } as any,
      );
      expect(result).toEqual({
        status: 0,
        data: [
          {
            openTime: '2025-10-10T00:00:00.000Z',
            open: '152.950',
            high: '152.960',
            low: '152.940',
            close: '152.955',
          },
        ],
        responsetime: '2025-10-10T02:50:00.000Z',
      });
    });

    it('should throw NotFoundException when kline cache requested but DB empty', async () => {
      (
        mockGmoCoinService.getLatestGmoCoinKline as jest.Mock
      ).mockResolvedValueOnce(null);

      const params = {
        symbol: 'USD_JPY',
        priceType: PriceType.ASK,
        interval: Interval.ONE_MIN,
        date: '20251010',
      };

      await expect(
        service.getKline(
          params as any,
          { cache: true, updateDb: false } as any,
        ),
      ).rejects.toThrow(AppErrorCodes.EXTERNAL_API_REQUEST_FAILED);
    });
  });

  describe('getRules', () => {
    it('should fetch and return rules data', async () => {
      const mockResponse = {
        status: 0,
        data: [
          {
            symbol: 'USD_JPY',
            tickSize: '0.001',
            minOpenOrderSize: '100',
            maxOrderSize: '500000',
            sizeStep: '1',
          },
        ],
        responsetime: '2025-10-10T02:50:00.000Z',
      };

      (fetchJson as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await service.getRules();

      expect(fetchJson).toHaveBeenCalledWith(
        'https://forex-api.coin.z.com/public/v1/symbols',
        {},
        expect.any(Object),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw HttpException on error', async () => {
      (fetchJson as jest.Mock).mockRejectedValueOnce(
        AppErrorCodes.EXTERNAL_API_REQUEST_FAILED,
      );

      await expect(service.getRules()).rejects.toThrow(
        AppErrorCodes.EXTERNAL_API_REQUEST_FAILED,
      );
    });

    it('should return cached rules when cache=true and DB has entry', async () => {
      const dbEntry = {
        statusCode: 0,
        responsetime: new Date('2025-10-10T02:50:00.000Z'),
        data: [
          {
            symbol: 'USD_JPY',
            tickSize: '0.001',
            minOpenOrderSize: '100',
            maxOrderSize: '500000',
            sizeStep: '1',
          },
        ],
      };

      (
        mockGmoCoinService.getLatestGmoCoinRules as jest.Mock
      ).mockResolvedValueOnce(dbEntry);

      const result = await service.getRules({
        cache: true,
        updateDb: false,
      } as any);
      expect(result).toEqual({
        status: 0,
        data: [
          {
            symbol: 'USD_JPY',
            tickSize: '0.001',
            minOpenOrderSize: '100',
            maxOrderSize: '500000',
            sizeStep: '1',
          },
        ],
        responsetime: '2025-10-10T02:50:00.000Z',
      });
    });

    it('should throw NotFoundException when rules cache requested but DB empty', async () => {
      (
        mockGmoCoinService.getLatestGmoCoinRules as jest.Mock
      ).mockResolvedValueOnce(null);

      await expect(
        service.getRules({ cache: true, updateDb: false } as any),
      ).rejects.toThrow(AppErrorCodes.EXTERNAL_API_REQUEST_FAILED);
    });
  });

  describe('getTickerSse', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should emit cached ticker immediately and again after 30s', async () => {
      const dbEntry = {
        statusCode: 0,
        responsetime: new Date('2025-10-10T02:47:36.025Z'),
        data: [
          {
            symbol: 'USD_JPY',
            ask: '152.956',
            bid: '152.952',
            timestamp: new Date('2025-10-10T02:47:35.951Z'),
            status: 'OPEN',
          },
        ],
      };

      // return the same DB entry for every poll during this test
      mockGmoCoinService.getLatestGmoCoinTicker = jest.fn().mockResolvedValue(
        dbEntry,
      );

      const emissions: any[] = [];
      const sub = service
        .getTickerSse()
        .subscribe((msg) => emissions.push(msg));

      // allow pending microtasks (Promise resolution)
      await Promise.resolve();

      expect(emissions.length).toBe(1);
      expect(emissions[0].event).toEqual('snapshot');
      expect(emissions[0].data).toEqual({
        status: 0,
        data: [
          {
            symbol: 'USD_JPY',
            ask: '152.956',
            bid: '152.952',
            timestamp: '2025-10-10T02:47:35.951Z',
            status: 'OPEN',
          },
        ],
        responsetime: '2025-10-10T02:47:36.025Z',
      });

      // advance time by 30 seconds to trigger next emission
      jest.advanceTimersByTime(30000);
      // allow promise resolution for the second emission
      await Promise.resolve();

      expect(emissions.length).toBe(2);
      expect(mockGmoCoinService.getLatestGmoCoinTicker).toHaveBeenCalledTimes(
        2,
      );

      sub.unsubscribe();
    });

    it('should send live update to SSE clients when getTicker is called', async () => {
      // Prepare fetch to return a ticker payload
      const mockResponse = {
        status: 0,
        data: [
          {
            symbol: 'USD_JPY',
            ask: '152.956',
            bid: '152.952',
            timestamp: '2025-10-10T02:47:35.951Z',
            status: 'OPEN',
          },
        ],
        responsetime: '2025-10-10T02:47:36.025Z',
      };

      (fetchJson as jest.Mock).mockResolvedValueOnce(mockResponse);

      // subscribe to SSE stream
          // ensure DB polling mock is set before subscribing (subscription can trigger immediate poll)
          mockGmoCoinService.getLatestGmoCoinTicker = jest
            .fn()
            .mockResolvedValueOnce(null);

      const emissions: any[] = [];
      const sub = service
        .getTickerSse()
        .subscribe((msg) => emissions.push(msg));

      // make sure initial DB polling resolves (mock explicitly returns null)
      mockGmoCoinService.getLatestGmoCoinTicker = jest
        .fn()
        .mockResolvedValueOnce(null);

      // allow pending microtasks and any scheduled timer callbacks to run
      await Promise.resolve();
      // run any pending timers that the SSE setup might have scheduled
      jest.runOnlyPendingTimers();

      expect(emissions.length).toBeGreaterThanOrEqual(1);

      // call getTicker() which should emit to the live subject
      const result = await service.getTicker();
      expect(result).toEqual(mockResponse);

      // since Subject.next is synchronous inside getTicker after await save, we should have a new emission
      expect(emissions.length).toBeGreaterThanOrEqual(2);
      // the last emission should be the live payload and event 'ticker'
      const last = emissions[emissions.length - 1];
      expect(last.event).toEqual('ticker');
      expect(last.data).toEqual(mockResponse);

      sub.unsubscribe();
    });
  });

  describe('history management', () => {
    it('should keep at most maxHistoryItems entries and prune older than 7 days', async () => {
      // Create 200 mock entries with various fetchedAt times
      const now = new Date('2025-10-10T03:00:00.000Z');
      jest.useFakeTimers();
      // setSystemTime exists on modern fake timers;
      jest.setSystemTime(now.getTime());

      // craft payload with responsetime set from now backwards
      const makePayload = (d: Date) => ({
        status: 0,
        data: [
          {
            symbol: 'USD_JPY',
            ask: '100',
            bid: '99',
            timestamp: d.toISOString(),
            status: 'OPEN',
          },
        ],
        responsetime: d.toISOString(),
      });

      // push 200 entries: some older than 7 days, some within 7 days
      for (let i = 0; i < 200; i++) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000); // each hour back
        const payload = makePayload(d);
        // call internal method to add
        service.addTickerToHistory(payload as any);
      }

      // After insertion, history should be <= maxHistoryItems and no entries older than 7 days
      const hist = (service as any).tickerHistory as Array<any>;
      const maxItems = (service as any).maxHistoryItems;
      expect(maxItems).toBeDefined();
      expect(hist.length).toBeLessThanOrEqual(maxItems);

      const cutoff = new Date(now.getTime());
      cutoff.setUTCDate(cutoff.getUTCDate() - 7);
      for (const e of hist) {
        expect(new Date(e.fetchedAt).getTime()).toBeGreaterThanOrEqual(
          cutoff.getTime(),
        );
      }

      jest.useRealTimers();
    });

    it('getTickerByDate should return only entries matching date', async () => {
      // Prepare entries for two dates
      (service as any).tickerHistory = [];
      const d1 = new Date('2025-10-08T10:00:00.000Z');
      const d2 = new Date('2025-10-09T11:00:00.000Z');

      const p1 = {
        status: 0,
        data: [
          {
            symbol: 'USD_JPY',
            ask: '1',
            bid: '1',
            timestamp: d1.toISOString(),
            status: 'OPEN',
          },
        ],
        responsetime: d1.toISOString(),
      };
      const p2 = {
        status: 0,
        data: [
          {
            symbol: 'USD_JPY',
            ask: '2',
            bid: '2',
            timestamp: d2.toISOString(),
            status: 'OPEN',
          },
        ],
        responsetime: d2.toISOString(),
      };

      service.addTickerToHistory(p1 as any);
      service.addTickerToHistory(p2 as any);

      const res1 = service.getTickerByDate('2025-10-08');
      expect(res1.length).toBeGreaterThanOrEqual(1);
      // all returned entries must have responsetime date matching 2025-10-08
      for (const e of res1) {
        expect(e.payload.responsetime.startsWith('2025-10-08')).toBeTruthy();
      }

      const res2 = service.getTickerByDate('2025-10-09');
      expect(res2.length).toBeGreaterThanOrEqual(1);
      for (const e of res2) {
        expect(e.payload.responsetime.startsWith('2025-10-09')).toBeTruthy();
      }
    });

    it('should merge with DB entry and retain only last 7 days and max items when large bulk added', async () => {
      // Simulate adding a large amount of historical data (hourly points) older than and within 7 days
      const now = new Date('2025-10-10T03:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(now.getTime());

      // clear any existing history
      (service as any).tickerHistory = [];

      const maxItems = (service as any).maxHistoryItems ?? 169;
      const maxDays = (service as any).maxHistoryDays ?? 7;
      const hour = 60 * 60 * 1000;

      // Insert 300 hourly entries going back in time. We advance the mocked system time for each
      for (let i = 0; i < 300; i++) {
        const time = now.getTime() - i * hour;
        jest.setSystemTime(time);
        const d = new Date(time);
        const payload = {
          status: 0,
          data: [
            {
              symbol: 'USD_JPY',
              ask: String(100 + i),
              bid: String(99 + i),
              timestamp: d.toISOString(),
              status: 'OPEN',
            },
          ],
          responsetime: d.toISOString(),
        };

        service.addTickerToHistory(payload as any);
      }

      // Now simulate a DB latest entry that is more recent than our 'now'
      const dbTime = new Date(now.getTime() + 60 * 1000); // +1 minute
      jest.setSystemTime(dbTime.getTime());
      const dbPayload = {
        status: 0,
        data: [
          {
            symbol: 'USD_JPY',
            ask: '999.9',
            bid: '999.8',
            timestamp: dbTime.toISOString(),
            status: 'OPEN',
          },
        ],
        responsetime: dbTime.toISOString(),
      };

      // Emulate merging DB latest by adding it to history as the newest entry
      service.addTickerToHistory(dbPayload as any);

      const hist = (service as any).tickerHistory as Array<any>;

      // Should be trimmed to at most maxItems
      expect(hist.length).toBeLessThanOrEqual(maxItems);

      // All entries must be within the last `maxDays` days counted from the newest (dbTime)
      const cutoff = new Date(dbTime.getTime());
      cutoff.setUTCDate(cutoff.getUTCDate() - maxDays);

      for (const e of hist) {
        expect(new Date(e.fetchedAt).getTime()).toBeGreaterThanOrEqual(
          cutoff.getTime(),
        );
      }

      // The first (newest) entry should be the DB payload we just added
      expect(hist[0].payload.responsetime).toEqual(dbPayload.responsetime);

      jest.useRealTimers();
    });
  });
});
