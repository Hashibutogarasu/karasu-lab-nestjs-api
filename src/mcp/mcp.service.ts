import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool } from '@nestjs-mcp/server';

@Resolver()
export class McpService {

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
}
