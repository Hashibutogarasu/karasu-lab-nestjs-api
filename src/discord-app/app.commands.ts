import { Injectable } from '@nestjs/common';
import * as necord from 'necord';
import { CoinService } from '../gmo/coin/coin.service';

@Injectable()
export class AppCommands {
  constructor(private readonly coinService: CoinService) {}
  @necord.SlashCommand({
    name: 'ping',
    description: 'Ping-Pong Command',
  })
  public async onPing(
    @necord.Context() [interaction]: necord.SlashCommandContext,
  ) {
    return interaction.reply({ content: 'Pong!' });
  }
}
