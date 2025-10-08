import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import z from 'zod';

@Injectable()
export class McpService {
  @Tool(
    'greeting-tool',
    'Returns a greeting with progress updates',
    z.object({
      name: z.string().default('World'),
    }),
  )
  async sayHello({ name }) {
    return `Hello, ${name}!`;
  }
}
