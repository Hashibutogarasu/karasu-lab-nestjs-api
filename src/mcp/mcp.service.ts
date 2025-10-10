import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool } from '@nestjs-mcp/server';

import { CoinService } from '../gmo/coin/coin.service';
import {
  GetKlineDto,
  GetKlineSchema,
} from '../gmo/coin/dto/gmo-coin-request.dto';
import { Inject } from '@nestjs/common';

@Resolver()
export class McpService {
  constructor(
    @Inject(CoinService)
    private readonly coinService: CoinService,
  ) {}

  @Tool({ name: 'server_health_check' })
  healthCheck(): CallToolResult {
    return {
      content: [
        {
          type: 'text',
          text: 'Server is operational. All systems running normally.',
        },
      ],
    };
  }

  /**
   * GMO Coin: 外国為替FXの稼働状態を取得
   */
  @Tool({
    name: 'gmo_coin_status',
    description: 'GMO Coinの外国為替FX稼働状態を取得します。',
  })
  async gmoCoinStatus(): Promise<CallToolResult> {
    const result = await this.coinService.getStatus();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  }

  /**
   * GMO Coin: 全銘柄分の最新レートを取得
   */
  @Tool({
    name: 'gmo_coin_ticker',
    description: 'GMO Coinの全銘柄分の最新レートを取得します。',
  })
  async gmoCoinTicker(): Promise<CallToolResult> {
    const result = await this.coinService.getTicker();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  }

  /**
   * GMO Coin: 指定した銘柄の四本値を取得
   */
  @Tool({
    name: 'gmo_coin_kline',
    description: 'GMO Coinの指定銘柄の四本値(KLine)を取得します。',
    paramsSchema: GetKlineSchema.shape as any,
  })
  async gmoCoinKline(params: GetKlineDto): Promise<CallToolResult> {
    const result = await this.coinService.getKline(params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  }

  /**
   * GMO Coin: 取引ルールを取得
   */
  @Tool({
    name: 'gmo_coin_rules',
    description: 'GMO Coinの取引ルールを取得します。',
  })
  async gmoCoinRules(): Promise<CallToolResult> {
    const result = await this.coinService.getRules();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  }
}
