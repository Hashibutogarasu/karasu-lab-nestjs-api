import { Injectable, Logger } from '@nestjs/common';
import { CreateDiscordAppDto } from './dto/create-discord-app.dto';
import { UpdateDiscordAppDto } from './dto/update-discord-app.dto';
import * as necord from 'necord';
import { Client } from 'discord.js';

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

  /**
   * Convert an ISO 8601 timestamp string (for example "2025-10-10T14:49:59.994525Z")
   * to a Discord-compatible Unix timestamp in seconds (number).
   *
   * Discord uses seconds since epoch when formatting timestamps (<t:TIMESTAMP>).
   * This function accepts sub-second precision (milliseconds, microseconds) and
   * will round down to the nearest second.
   *
   * Throws an Error if the input is not a valid ISO timestamp.
   */
  public isoToDiscordTimestamp(iso: string): number {
    if (typeof iso !== 'string' || iso.length === 0) {
      throw new Error('isoToDiscordTimestamp: iso must be a non-empty string');
    }

    // Normalize possible microsecond precision by trimming to milliseconds
    // Date.parse cannot handle more than 3 fractional digits reliably, so
    // reduce excessive fractional digits to 3 by trimming.
    const match = iso.match(
      /^(.*T\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/,
    );
    if (!match) {
      throw new Error(`isoToDiscordTimestamp: invalid ISO timestamp: ${iso}`);
    }

    const timePart = match[1];
    const frac = match[2] || '';
    const zone = match[3] || 'Z';

    // Keep up to 3 fractional digits (milliseconds). If there are more, trim.
    const normalizedFrac = frac
      ? frac.length > 4
        ? frac.slice(0, 4)
        : frac
      : '';
    const normalized = `${timePart}${normalizedFrac}${zone}`;

    const ms = Date.parse(normalized);
    if (Number.isNaN(ms)) {
      throw new Error(
        `isoToDiscordTimestamp: could not parse timestamp: ${iso}`,
      );
    }

    // Convert milliseconds to seconds and floor to get Discord-compatible value
    return Math.floor(ms / 1000);
  }
}
