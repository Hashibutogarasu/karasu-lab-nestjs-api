import { Controller, Get, Query, UseGuards, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CoinService } from './coin.service';
import {
  GmoCoinStatusResponseDto,
  GmoCoinTickerResponseDto,
  GmoCoinKlineResponseDto,
  GmoCoinRulesResponseDto,
} from './dto/gmo-coin.dto-response';
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
  @UseGuards(AdminGuard)
  @Get('status')
  async getStatus(): Promise<GmoCoinStatusResponseDto> {
    return this.coinService.getStatus();
  }

  /**
   * 全銘柄分の最新レートを取得
   * GET /gmo/coin/ticker
   */
  @UseGuards(AdminGuard)
  @Get('ticker')
  async getTicker(): Promise<GmoCoinTickerResponseDto> {
    return this.coinService.getTicker();
  }

  /**
   * 指定した銘柄の四本値を取得
   * GET /gmo/coin/klines?symbol=USD_JPY&priceType=ASK&interval=1min&date=20251010
   */
  @UseGuards(AdminGuard)
  @Get('klines')
  async getKline(
    @Query() query: GetKlineDto,
  ): Promise<GmoCoinKlineResponseDto> {
    return this.coinService.getKline(query);
  }

  /**
   * 取引ルールを取得
   * GET /gmo/coin/rules
   */
  @UseGuards(AdminGuard)
  @Get('rules')
  async getRules(): Promise<GmoCoinRulesResponseDto> {
    return this.coinService.getRules();
  }
}
