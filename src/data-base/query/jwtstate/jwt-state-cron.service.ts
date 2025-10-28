import { Injectable } from '@nestjs/common';
import { JwtstateService } from './jwtstate.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class JwtStateCronService {
  constructor(private readonly jwtstateService: JwtstateService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCleanupExpiredJWTStates() {
    await this.jwtstateService.cleanupExpiredJWTStates();
  }
}
