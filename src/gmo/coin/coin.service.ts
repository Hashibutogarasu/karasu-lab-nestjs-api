import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Observable, interval, from } from 'rxjs';
import { switchMap, map, startWith } from 'rxjs/operators';
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
import {
  saveGmoCoinStatus,
  saveGmoCoinTicker,
  saveGmoCoinKline,
  saveGmoCoinRules,
} from '../../lib/database/query';
import { GetKlineDto } from './dto/gmo-coin-request.dto';
import { getLatestGmoCoinTicker } from '../../lib/database/query';

@Injectable()
export class CoinService {
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
      await saveGmoCoinStatus(parsed);
      return parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new HttpException(
          'Invalid response format from GMO Coin status API',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
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
      await saveGmoCoinTicker(parsed);
      return parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new HttpException(
          'Invalid response format from GMO Coin ticker API',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
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
      await saveGmoCoinKline(parsed);
      return parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new HttpException(
          'Invalid response format from GMO Coin kline API',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
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
      await saveGmoCoinRules(parsed);
      return parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new HttpException(
          'Invalid response format from GMO Coin rules API',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        'Failed to fetch GMO Coin rules',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * SSE向け: DBのキャッシュされた最新ティッカーを1分ごとに返す
   * Returns Observable of MessageEvent containing parsed GmoCoinTicker-like object
   */
  getTickerSse(): Observable<MessageEvent<GmoCoinTicker>> {
    // Emit immediately, then every 60 seconds
    return interval(60000).pipe(
      startWith(0),
      switchMap(() => from(getLatestGmoCoinTicker())),
      map((dbEntry) => {
        // dbEntry is the prisma model including `statusCode`, `responsetime`, and `data` array
        const payload: any = dbEntry
          ? {
              status: dbEntry.statusCode,
              data: dbEntry.data.map((d) => ({
                symbol: d.symbol,
                ask: d.ask,
                bid: d.bid,
                timestamp: d.timestamp.toISOString(),
                status: d.status,
              })),
              responsetime: dbEntry.responsetime.toISOString(),
            }
          : { status: 0, data: [], responsetime: new Date().toISOString() };

        const msg: MessageEvent<GmoCoinTicker> = {
          data: payload,
        } as unknown as MessageEvent<GmoCoinTicker>;

        return msg;
      }),
    );
  }
}
