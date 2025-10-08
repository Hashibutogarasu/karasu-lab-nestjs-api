import {
  Controller,
  Post,
  Body,
  Res,
  HttpException,
  HttpStatus,
  Request,
} from '@nestjs/common';
import type { Response } from 'express';
import { DifyService } from './dify.service';
import { ChatMessageRequestDto } from './dify/dify.dto';
import { DomainProtected } from '../lib/domain';

@Controller('dify')
export class DifyController {
  constructor(private readonly difyService: DifyService) {}

  @Post('chat/stream')
  @DomainProtected()
  async streamChatMessage(
    @Body() chatRequest: ChatMessageRequestDto,
    @Res() res: Response,
    @Request() req: any,
  ) {
    try {
      // JWTトークンからユーザーIDを取得してuserフィールドに設定
      const userId = req.user?.sub || req.user?.id;
      if (!userId) {
        throw new HttpException('User ID not found', HttpStatus.UNAUTHORIZED);
      }

      // リクエストにユーザーIDを設定
      chatRequest.user = userId;

      // SSEヘッダーを設定
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

      // Dify APIからストリームを取得
      const stream = await this.difyService.sendChatMessageStream(chatRequest);
      const parsedStream = this.difyService.parseSSEStream(stream);

      // ストリームデータをSSE形式で送信
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

      // クライアントが接続を切断した場合のハンドリング
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
