import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Client } from 'discord.js';
import { DiscordAppService } from './discord-app.service';

@Injectable()
export class DiscordAppCronService {
  constructor(
    private readonly client: Client,
    private readonly discordAppService: DiscordAppService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  public updateActivity() {
    const joinedGuilds = this.discordAppService.getJoinedGuildCount();
    if (this.client.user) {
      this.client.user.setPresence({
        activities: [{ name: `with ${joinedGuilds} servers` }],
      });
    }
  }
}
