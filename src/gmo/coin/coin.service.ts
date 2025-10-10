import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { Observable, interval, from, Subject, merge } from 'rxjs';
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
  getLatestGmoCoinStatus,
  getLatestGmoCoinTicker,
  getLatestGmoCoinKline,
  getLatestGmoCoinRules,
} from '../../lib/database/query';
import { GetKlineDto } from './dto/gmo-coin-request.dto';

@Injectable()
export class CoinService {
  private readonly baseUrl = 'https://forex-api.coin.z.com/public';
  private readonly logger = new Logger(CoinService.name);

  // SSE 用ライブ通知チャネル。cron 等から getTicker() が呼ばれた際に通知する。
  private tickerSubject = new Subject<GmoCoinTicker>();

  // インメモリのティッカーヒストリキャッシュ（取得ごとに1エントリ）。
  // 取得間隔を30秒に変更したため、1週間分の上限を再計算します:
  // 1週間 = 7日, 1日 = 24時間, 1時間あたり120回(30秒毎) => 7 * 24 * 120 = 20160
  private tickerHistory: Array<{ fetchedAt: Date; payload: any }> = [];
  private readonly maxHistoryItems = 20160;
  // データは最大7日分を保持（7日より古いデータは削除）
  private readonly maxHistoryDays = 7;

  /**
   * 外国為替FXの稼働状態を取得
   */
  async getStatus(
    { updateDb, cache }: { updateDb: boolean; cache?: boolean } = {
      updateDb: true,
      cache: false,
    },
  ): Promise<GmoCoinStatus> {
    try {
      // If caller requests cached value, return DB latest or throw NotFound
      if (cache) {
        const dbEntry = await getLatestGmoCoinStatus();
        if (!dbEntry) {
          throw new NotFoundException('No cached GMO Coin status available');
        }

        return {
          status: dbEntry.statusCode,
          data: dbEntry.data,
          responsetime: dbEntry.responsetime.toISOString(),
        } as GmoCoinStatus;
      }
      const response = await fetch(`${this.baseUrl}/v1/status`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const parsed = GmoCoinStatusSchema.parse(data);
      if (updateDb) {
        await saveGmoCoinStatus(parsed);
      }
      return parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new HttpException(
          'Invalid response format from GMO Coin status API',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      if (error instanceof NotFoundException) {
        throw error;
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
  async getTicker(
    { updateDb, cache }: { updateDb?: boolean; cache?: boolean } = {
      updateDb: true,
      cache: false,
    },
  ): Promise<GmoCoinTicker> {
    try {
      if (cache) {
        const dbEntry = await getLatestGmoCoinTicker();
        if (!dbEntry) {
          throw new NotFoundException('No cached GMO Coin ticker available');
        }

        return {
          status: dbEntry.statusCode,
          data: dbEntry.data.map((d) => ({
            symbol: d.symbol,
            ask: d.ask,
            bid: d.bid,
            timestamp: d.timestamp.toISOString(),
            status: d.status,
          })),
          responsetime: dbEntry.responsetime.toISOString(),
        } as GmoCoinTicker;
      }
      const response = await fetch(`${this.baseUrl}/v1/ticker`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const parsed = GmoCoinTickerSchema.parse(data);
      if (updateDb) {
        // インメモリ履歴に追加
        this.addTickerToHistory(parsed);
        await saveGmoCoinTicker(parsed);

        // ライブ通知を行う（SSE リスナーへ即時配信）
        try {
          this.tickerSubject.next(parsed);
        } catch (err) {
          this.logger.error('Failed to emit ticker to subject', err);
        }
      }

      return parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new HttpException(
          'Invalid response format from GMO Coin ticker API',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch GMO Coin ticker',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * ティッカーのペイロードをインメモリの履歴に追加し、件数と経過日数で古いデータを削除する
   * - 最新を先頭に追加
   * - 件数が maxHistoryItems を超えれば切り詰める
   * - maxHistoryDays より古いデータは削除する
   */
  addTickerToHistory(parsed: GmoCoinTicker) {
    try {
      const now = new Date();
      this.tickerHistory.unshift({ fetchedAt: now, payload: parsed });

      // 件数上限で切り詰め
      if (this.tickerHistory.length > this.maxHistoryItems) {
        this.tickerHistory = this.tickerHistory.slice(0, this.maxHistoryItems);
      }

      // 日数上限で古いものを削除
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - this.maxHistoryDays);
      this.tickerHistory = this.tickerHistory.filter(
        (e) => e.fetchedAt >= cutoff,
      );
    } catch (err) {
      this.logger.error('Failed to add ticker to history', err);
    }
  }

  /**
   * テスト用に公開: 指定した日付文字列 (YYYY-MM-DD) とレスポンスタイムが一致する履歴エントリを返す
   */
  getTickerByDate(dateStr: string) {
    // responsetime の日付部分が一致するエントリを返す
    return this.tickerHistory.filter((entry) => {
      try {
        const respTime = new Date(entry.payload.responsetime);
        const y = respTime.getUTCFullYear();
        const m = String(respTime.getUTCMonth() + 1).padStart(2, '0');
        const d = String(respTime.getUTCDate()).padStart(2, '0');
        const key = `${y}-${m}-${d}`;
        return key === dateStr;
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * 指定した銘柄の四本値を取得
   */
  async getKline(
    params: GetKlineDto,
    { updateDb, cache }: { updateDb: boolean; cache?: boolean } = {
      updateDb: true,
      cache: false,
    },
  ): Promise<GmoCoinKline> {
    try {
      if (cache) {
        const dbEntry = await getLatestGmoCoinKline();
        if (!dbEntry) {
          throw new NotFoundException('No cached GMO Coin kline available');
        }

        return {
          status: dbEntry.statusCode,
          data: dbEntry.data.map((d) => ({
            openTime: d.openTime.toISOString(),
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          })),
          responsetime: dbEntry.responsetime.toISOString(),
        } as GmoCoinKline;
      }
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
      if (updateDb) {
        await saveGmoCoinKline(parsed);
      }
      return parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new HttpException(
          'Invalid response format from GMO Coin kline API',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      if (error instanceof NotFoundException) {
        throw error;
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
  async getRules(
    { updateDb, cache }: { updateDb: boolean; cache?: boolean } = {
      updateDb: true,
      cache: false,
    },
  ): Promise<GmoCoinRules> {
    try {
      if (cache) {
        const dbEntry = await getLatestGmoCoinRules();
        if (!dbEntry) {
          throw new NotFoundException('No cached GMO Coin rules available');
        }

        return {
          status: dbEntry.statusCode,
          data: dbEntry.data.map((d) => ({
            symbol: d.symbol,
            tickSize: d.tickSize,
            minOpenOrderSize: d.minOpenOrderSize,
            maxOrderSize: d.maxOrderSize,
            sizeStep: d.sizeStep,
          })),
          responsetime: dbEntry.responsetime.toISOString(),
        } as GmoCoinRules;
      }
      const response = await fetch(`${this.baseUrl}/v1/symbols`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const parsed = GmoCoinRulesSchema.parse(data);
      if (updateDb) {
        await saveGmoCoinRules(parsed);
      }
      return parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new HttpException(
          'Invalid response format from GMO Coin rules API',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch GMO Coin rules',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * SSE用: DB のキャッシュされた最新ティッカーを Observable で返す（即時とその後1分ごと）
   */
  getTickerSse(): Observable<MessageEvent<GmoCoinTicker>> {
    // DBポーリング Observable: 即時1回、その後30秒ごとにDBの最新キャッシュを取得
    const dbPolling$ = interval(30000).pipe(
      startWith(0),
      switchMap(() => from(getLatestGmoCoinTicker())),
      map((dbEntry) => {
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
          // 新規接続時や定期ポーリングはスナップショットとして扱う
          // Nest の Sse サポートでは { event?: string, data } を返せる
          data: payload,
          event: 'snapshot',
        } as unknown as MessageEvent<GmoCoinTicker>;

        return msg;
      }),
    );

    // ライブ通知 Observable: getTicker() が成功した際に this.tickerSubject に next される
    const live$ = this.tickerSubject.pipe(
      map((parsed) => {
        const msg: MessageEvent<GmoCoinTicker> = {
          data: parsed,
          // ライブ更新は 'ticker' イベント
          event: 'ticker',
        } as unknown as MessageEvent<GmoCoinTicker>;
        return msg;
      }),
    );

    // DBポーリングとライブ通知をマージして返す。これにより既存のDBポーリングの即時送信を維持しつつ、
    // cronなどで getTicker() が呼ばれたときに接続済みクライアントへ即時配信される。
    return merge(dbPolling$, live$);
  }
}
