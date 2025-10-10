import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Client } from 'discord.js';

@Injectable()
export class DiscordAppCronService {
  constructor(private readonly client: Client) {}

  @Cron(CronExpression.EVERY_HOUR)
  public updateActivity() {
    const joinedGuilds = this.client.guilds.cache.size;
    if (this.client.user) {
      this.client.user.setPresence({
        activities: [{ name: `with ${joinedGuilds} servers` }],
      });
    }
  }
}
