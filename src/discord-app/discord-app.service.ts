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
}
