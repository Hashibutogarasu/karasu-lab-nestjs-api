import { Injectable, Logger } from '@nestjs/common';
import { CoinService } from '../coin.service';

@Injectable()
export class GmoCoinCronService {
  private readonly logger: Logger;

  constructor(private readonly coinService: CoinService) {
    this.logger = new Logger(GmoCoinCronService.name);
  }

  /**
   * Cron: 定期的に最新ティッカーを取得して履歴へ保存する
   */
  // @Cron(CronExpression.EVERY_30_SECONDS)
  async fetchTickerCron() {
    try {
      await this.coinService.getTicker({
        cache: false,
        updateDb: true,
      });
    } catch (e) {
      this.logger.error('Cron fetchTicker failed', e);
    }
  }

  /**
   * Cron: 定期的にサービス稼働状態を取得して保存する
   */
  // @Cron(CronExpression.EVERY_30_SECONDS)
  async fetchStatusCron() {
    try {
      await this.coinService.getStatus({
        cache: false,
        updateDb: true,
      });
    } catch (e) {
      this.logger.error('Cron fetchStatus failed', e);
    }
  }
}
