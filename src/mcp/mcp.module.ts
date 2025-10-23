import { Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { McpModule } from '@nestjs-mcp/server';

@Module({
  imports: [
    McpModule.forRoot({
      name: 'Karasu Lab MCP Server',
      version: '1.0.0',
      instructions: 'A server providing utility tools and data.',
      logging: { level: 'log' },
      transports: { sse: { enabled: false } },
    }),
  ],
  providers: [McpService],
})
export class McpServerModule {}
