import { Injectable } from '@nestjs/common';
import * as necord from 'necord';

@Injectable()
export class AppCommands {
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
