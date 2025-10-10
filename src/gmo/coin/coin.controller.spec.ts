import { Test, TestingModule } from '@nestjs/testing';
import { CoinController } from './coin.controller';
import { CoinService } from './coin.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import {
  GmoCoinStatus,
  GmoCoinTicker,
  GmoCoinKline,
  GmoCoinRules,
} from '../../types/gmo-coin';
import { GetKlineDto, PriceType, Interval } from './dto/gmo-coin-request.dto';

describe('CoinController', () => {
  let controller: CoinController;
  let service: CoinService;

  const mockStatus: GmoCoinStatus = {
    status: 0,
    data: {
      status: 'OPEN',
    },
    responsetime: '2025-10-10T02:45:39.342Z',
  };

  const mockTicker: GmoCoinTicker = {
    status: 0,
    data: [
      {
        symbol: 'USD_JPY',
        ask: '152.956',
        bid: '152.952',
        timestamp: '2025-10-10T02:47:35.951602Z',
        status: 'OPEN',
      },
      {
        symbol: 'EUR_JPY',
        ask: '176.959',
        bid: '176.953',
        timestamp: '2025-10-10T02:47:35.951773Z',
        status: 'OPEN',
      },
    ],
    responsetime: '2025-10-10T02:47:36.025Z',
  };

  const mockKline: GmoCoinKline = {
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

  const mockRules: GmoCoinRules = {
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

  const mockCoinService = {
    getStatus: jest.fn().mockResolvedValue(mockStatus),
    getTicker: jest.fn().mockResolvedValue(mockTicker),
    getKline: jest.fn().mockResolvedValue(mockKline),
    getRules: jest.fn().mockResolvedValue(mockRules),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoinController],
      providers: [
        {
          provide: CoinService,
          useValue: mockCoinService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<CoinController>(CoinController);
    service = module.get<CoinService>(CoinService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStatus', () => {
    it('should return GMO Coin status', async () => {
      const result = await controller.getStatus();
      expect(result).toEqual(mockStatus);
      expect(mockCoinService.getStatus).toHaveBeenCalled();
    });
  });

  describe('getTicker', () => {
    it('should return GMO Coin ticker data', async () => {
      const result = await controller.getTicker();
      expect(result).toEqual(mockTicker);
      expect(mockCoinService.getTicker).toHaveBeenCalled();
    });
  });

  describe('getKline', () => {
    it('should return GMO Coin kline data', async () => {
      const query: GetKlineDto = {
        symbol: 'USD_JPY',
        priceType: PriceType.ASK,
        interval: Interval.ONE_MIN,
        date: '20251010',
      };

      const result = await controller.getKline(query);
      expect(result).toEqual(mockKline);
      expect(mockCoinService.getKline).toHaveBeenCalledWith(query);
    });
  });

  describe('getRules', () => {
    it('should return GMO Coin rules', async () => {
      const result = await controller.getRules();
      expect(result).toEqual(mockRules);
      expect(mockCoinService.getRules).toHaveBeenCalled();
    });
  });
});
