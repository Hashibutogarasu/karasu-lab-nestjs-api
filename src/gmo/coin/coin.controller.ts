import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CoinService } from './coin.service';
import {
  GmoCoinStatusResponseDto,
  GmoCoinTickerResponseDto,
  GmoCoinKlineResponseDto,
  GmoCoinRulesResponseDto,
} from './dto/gmo-coin.dto-response';
import { GetKlineDto } from './dto/gmo-coin-request.dto';

@Controller('gmo/coin')
@UseGuards(JwtAuthGuard)
export class CoinController {
  constructor(private readonly coinService: CoinService) {}

  /**
   * 外国為替FXの稼働状態を取得
   * GET /gmo/coin/status
   */
  @Get('status')
  async getStatus(): Promise<GmoCoinStatusResponseDto> {
    return this.coinService.getStatus();
  }

  /**
   * 全銘柄分の最新レートを取得
   * GET /gmo/coin/ticker
   */
  @Get('ticker')
  async getTicker(): Promise<GmoCoinTickerResponseDto> {
    return this.coinService.getTicker();
  }

  /**
   * 指定した銘柄の四本値を取得
   * GET /gmo/coin/klines?symbol=USD_JPY&priceType=ASK&interval=1min&date=20251010
   */
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
  @Get('rules')
  async getRules(): Promise<GmoCoinRulesResponseDto> {
    return this.coinService.getRules();
  }
}
