import { Controller, Get, UseGuards, Sse, Query } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CoinService } from './coin.service';
import {
  GmoCoinStatusResponseDto,
  GmoCoinTickerResponseDto,
  GmoCoinKlineResponseDto,
  GmoCoinRulesResponseDto,
} from './dto/gmo-coin.dto-response';
import { getGmoCoinTickers } from '../../lib/database/query';
import { GetKlineDto } from './dto/gmo-coin-request.dto';
import { AdminGuard } from '../../auth/guards/admin.guard';

/**
 * GMOコインの外国為替FXに関するAPIエンドポイント
 * 管理者権限を必要とするエンドポイントは、主にデータベースの更新を伴う操作です。
 */
@UseGuards(JwtAuthGuard)
@Controller('gmo/coin')
export class CoinController {
  constructor(private readonly coinService: CoinService) {}

  /**
   * 認証された一般ユーザー用エンドポイント
   * SSEストリーム: DBのキャッシュされたティッカーを1分おきに送信
   * GET /gmo/coin/ticker/stream
   */
  @Sse('ticker/stream')
  getTickerStream(): Observable<MessageEvent<GmoCoinTickerResponseDto>> {
    return this.coinService.getTickerSse();
  }

  /**
   * 外国為替FXの稼働状態を取得
   * GET /gmo/coin/status
   */
  @Get('status')
  async getStatus(): Promise<GmoCoinStatusResponseDto> {
    return this.coinService.getStatus({
      updateDb: false,
      cache: true,
    });
  }

  /**
   * 全銘柄分の最新レートを取得
   * GET /gmo/coin/ticker
   */
  @Get('ticker')
  async getTicker(): Promise<GmoCoinTickerResponseDto> {
    return this.coinService.getTicker({
      updateDb: false,
      cache: true,
    });
  }

  /**
   * 指定した銘柄の四本値を取得
   * GET /gmo/coin/klines?symbol=USD_JPY&priceType=ASK&interval=1min&date=20251010
   */
  @Get('klines')
  async getKline(
    @Query() query: GetKlineDto,
  ): Promise<GmoCoinKlineResponseDto> {
    return this.coinService.getKline(query, {
      updateDb: false,
      cache: true,
    });
  }

  /**
   * 取引ルールを取得
   * GET /gmo/coin/rules
   */
  @Get('rules')
  async getRules(): Promise<GmoCoinRulesResponseDto> {
    return this.coinService.getRules({
      updateDb: false,
      cache: true,
    });
  }

  /**
   * DB に保存された複数のティッカーキャッシュ（直近 n 件）を取得
   * GET /gmo/coin/tickers?limit=10
   */
  @Get('tickers')
  async getTickers(
    @Query('limit') limit?: string,
  ): Promise<GmoCoinTickerResponseDto[]> {
    const n = limit ? parseInt(limit, 10) : 10;
    const rows = await getGmoCoinTickers(n);

    // map to response DTO shape
    return rows.map((row) => ({
      ...row,
      status: row.statusCode,
      data: row.data.map((d) => ({
        ...d,
        timestamp: d.timestamp.toISOString(),
        status: d.status as 'OPEN' | 'CLOSE' | 'MAINTENANCE',
      })),
      responsetime: row.responsetime.toISOString(),
    }));
  }
}
