import { Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { McpModule } from '@rekog/mcp-nest';

@Module({
  imports: [
    McpModule.forRoot({
      name: 'karasu-lab-mcp-server',
      version: '1.0.0',
      capabilities: {},
    }),
  ],
  providers: [McpService],
})
export class McpServerModule {}
