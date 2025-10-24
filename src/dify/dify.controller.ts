import { Controller, Post, Body, Res, Request } from '@nestjs/common';
import type { Response } from 'express';
import { DifyService } from './dify.service';
import { ChatMessageRequestDto } from './dify/dify.dto';
import { DomainProtected } from '../lib/domain';
import { NoInterceptor } from '../interceptors/no-interceptor.decorator';
import { AuthUser } from '../auth/decorators/auth-user.decorator';
import type { PublicUser } from '../auth/decorators/auth-user.decorator';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
@NoInterceptor()
@ApiBearerAuth()
@Controller('dify')
export class DifyController {
  constructor(private readonly difyService: DifyService) { }

  @ApiBody({ type: ChatMessageRequestDto })
  @Post('chat/stream')
  @DomainProtected()
  async streamChatMessage(
    @Body() chatRequest: ChatMessageRequestDto,
    @Res() res: Response,
    @Request() req: any,
    @AuthUser() user: PublicUser,
  ) {
    try {
      chatRequest.user = user.id;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

      const stream = await this.difyService.sendChatMessageStream(chatRequest);
      const parsedStream = this.difyService.parseSSEStream(stream);

      parsedStream.on('data', (data) => {
        if (data) {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
      });

      parsedStream.on('end', () => {
        res.write('data: [DONE]\n\n');
        res.end();
      });

      parsedStream.on('error', (error) => {
        console.error('Stream error:', error);
        res.write(
          `event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`,
        );
        res.end();
      });

      req.on('close', () => {
        parsedStream.destroy();
      });
    } catch (error) {
      console.error('Chat stream error:', error);

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
          message: error.message,
        });
      } else {
        res.write(
          `event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`,
        );
        res.end();
      }
    }
  }
}
