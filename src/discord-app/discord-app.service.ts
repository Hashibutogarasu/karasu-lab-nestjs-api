import { Injectable, Logger } from '@nestjs/common';
import * as necord from 'necord';
import { Client } from 'discord.js';
import { AppErrorCodes } from '../types/error-codes';

@Injectable()
export class DiscordAppService {
  private readonly logger = new Logger(DiscordAppService.name);

  public constructor(private readonly client: Client) {}

  @necord.Once('clientReady')
  public onReady(@necord.Context() [client]: necord.ContextOf<'clientReady'>) {
    this.logger.log(`Bot logged in as ${client.user.username}`);
  }

  @necord.On('warn')
  public onWarn(@necord.Context() [message]: necord.ContextOf<'warn'>) {
    this.logger.warn(message);
  }

  getJoinedGuildCount(): number {
    return this.client.guilds.cache.size;
  }

  public isoToDiscordTimestamp(iso: string): number {
    if (typeof iso !== 'string' || iso.length === 0) {
      throw AppErrorCodes.EMPTY_ISO_STRING;
    }
    const match = iso.match(
      /^(.*T\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/,
    );
    if (!match) {
      throw AppErrorCodes.INVALID_ISO_TIMESTAMP;
    }

    const timePart = match[1];
    const frac = match[2] || '';
    const zone = match[3] || 'Z';
    const normalizedFrac = frac
      ? frac.length > 4
        ? frac.slice(0, 4)
        : frac
      : '';
    const normalized = `${timePart}${normalizedFrac}${zone}`;

    const ms = Date.parse(normalized);
    if (Number.isNaN(ms)) {
      throw AppErrorCodes.INVALID_ISO_TIMESTAMP;
    }
    return Math.floor(ms / 1000);
  }
}
