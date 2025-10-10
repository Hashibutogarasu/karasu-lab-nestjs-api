import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ZodError } from 'zod';
import {
  GmoCoinStatusSchema,
  GmoCoinTickerSchema,
  GmoCoinKlineSchema,
  GmoCoinRulesSchema,
  GmoCoinStatus,
  GmoCoinTicker,
  GmoCoinKline,
  GmoCoinRules,
} from '../../types/gmo-coin';
import { GetKlineDto } from './dto/gmo-coin-request.dto';

@Injectable()
export class CoinService {
  private readonly logger = new Logger(CoinService.name);
  private readonly baseUrl = 'https://forex-api.coin.z.com/public';

  /**
   * 外国為替FXの稼働状態を取得
   */
  async getStatus(): Promise<GmoCoinStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/status`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const parsed = GmoCoinStatusSchema.parse(data);
      return parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        // this.logger.error(
        //   'Failed to parse GMO Coin status response',
        //   error.issues,
        // );
        throw new HttpException(
          'Invalid response format from GMO Coin status API',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      // this.logger.error('Failed to fetch GMO Coin status', error);
      throw new HttpException(
        'Failed to fetch GMO Coin status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 全銘柄分の最新レートを取得
   */
  async getTicker(): Promise<GmoCoinTicker> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/ticker`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const parsed = GmoCoinTickerSchema.parse(data);
      return parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        // this.logger.error(
        //   'Failed to parse GMO Coin ticker response',
        //   error.issues,
        // );
        throw new HttpException(
          'Invalid response format from GMO Coin ticker API',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      // this.logger.error('Failed to fetch GMO Coin ticker', error);
      throw new HttpException(
        'Failed to fetch GMO Coin ticker',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 指定した銘柄の四本値を取得
   */
  async getKline(params: GetKlineDto): Promise<GmoCoinKline> {
    try {
      const queryParams = new URLSearchParams({
        symbol: params.symbol,
        priceType: params.priceType,
        interval: params.interval,
        date: params.date,
      });

      const response = await fetch(
        `${this.baseUrl}/v1/klines?${queryParams.toString()}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const parsed = GmoCoinKlineSchema.parse(data);
      return parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        // this.logger.error(
        //   'Failed to parse GMO Coin kline response',
        //   error.issues,
        // );
        throw new HttpException(
          'Invalid response format from GMO Coin kline API',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      // this.logger.error('Failed to fetch GMO Coin kline data', error);
      throw new HttpException(
        'Failed to fetch GMO Coin kline data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 取引ルールを取得
   */
  async getRules(): Promise<GmoCoinRules> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/symbols`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const parsed = GmoCoinRulesSchema.parse(data);
      return parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        // this.logger.error(
        //   'Failed to parse GMO Coin rules response',
        //   error.issues,
        // );
        throw new HttpException(
          'Invalid response format from GMO Coin rules API',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      // this.logger.error('Failed to fetch GMO Coin rules', error);
      throw new HttpException(
        'Failed to fetch GMO Coin rules',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
