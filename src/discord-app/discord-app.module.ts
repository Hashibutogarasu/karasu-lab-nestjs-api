import { Module } from '@nestjs/common';
import { DiscordAppService } from './discord-app.service';
import { DiscordAppController } from './discord-app.controller';
import { NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';
import { AppCommands } from './app.commands';

@Module({
  imports: [
    NecordModule.forRoot({
      token: process.env.DISCORD_BOT_TOKEN!,
      intents: [IntentsBitField.Flags.Guilds],
    }),
  ],
  controllers: [DiscordAppController],
  providers: [DiscordAppService, AppCommands],
})
export class DiscordAppModule {}
