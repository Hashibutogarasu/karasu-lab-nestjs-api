import { Test, TestingModule } from '@nestjs/testing';
import { CoinService } from './coin.service';
import { HttpException } from '@nestjs/common';
import { PriceType, Interval } from './dto/gmo-coin-request.dto';

// Mock DB save functions to avoid contacting real database during unit tests
jest.mock('../../lib/database/query', () => ({
  saveGmoCoinStatus: jest.fn().mockResolvedValue(null),
  saveGmoCoinTicker: jest.fn().mockResolvedValue(null),
  saveGmoCoinKline: jest.fn().mockResolvedValue(null),
  saveGmoCoinRules: jest.fn().mockResolvedValue(null),
}));

// グローバルfetchのモック
global.fetch = jest.fn();

describe('CoinService', () => {
  let service: CoinService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoinService],
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

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.getStatus();

      expect(fetch).toHaveBeenCalledWith(
        'https://forex-api.coin.z.com/public/v1/status',
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw HttpException on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      await expect(service.getStatus()).rejects.toThrow(HttpException);
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
            timestamp: '2025-10-10T02:47:35.951602Z',
            status: 'OPEN',
          },
        ],
        responsetime: '2025-10-10T02:47:36.025Z',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.getTicker();

      expect(fetch).toHaveBeenCalledWith(
        'https://forex-api.coin.z.com/public/v1/ticker',
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw HttpException on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      await expect(service.getTicker()).rejects.toThrow(HttpException);
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

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const params = {
        symbol: 'USD_JPY',
        priceType: PriceType.ASK,
        interval: Interval.ONE_MIN,
        date: '20251010',
      };

      const result = await service.getKline(params);

      expect(fetch).toHaveBeenCalledWith(
        'https://forex-api.coin.z.com/public/v1/klines?symbol=USD_JPY&priceType=ASK&interval=1min&date=20251010',
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw HttpException on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const params = {
        symbol: 'USD_JPY',
        priceType: PriceType.ASK,
        interval: Interval.ONE_MIN,
        date: '20251010',
      };

      await expect(service.getKline(params)).rejects.toThrow(HttpException);
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

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.getRules();

      expect(fetch).toHaveBeenCalledWith(
        'https://forex-api.coin.z.com/public/v1/symbols',
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw HttpException on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      await expect(service.getRules()).rejects.toThrow(HttpException);
    });
  });
});
