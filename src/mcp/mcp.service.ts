import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool } from '@nestjs-mcp/server';
import { DiscordAppService } from '../discord-app/discord-app.service';

@Resolver()
export class McpService {
  constructor(
    private readonly discordAppService: DiscordAppService,
  ) { }

  @Tool({ name: 'server_health_check' })
  healthCheck(): CallToolResult {
    return {
      content: [
        {
          type: 'text',
          text: 'Server is operational. All systems running normally.',
        },
      ],
    };
  }

  @Tool({ name: 'get_discord_guild_count' })
  getDiscordGuildCount(): CallToolResult {
    const guildCount = this.discordAppService.getJoinedGuildCount();
    return {
      content: [
        {
          type: 'text',
          text: `The Discord bot is currently in ${guildCount} guild(s).`,
        },
      ],
    };
  }
}
