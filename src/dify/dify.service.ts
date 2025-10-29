import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ChatMessageRequestDto } from './dify/dify.dto';
import { Readable } from 'stream';
import { AppErrorCodes } from '../types/error-codes';

@Injectable()
export class DifyService {
  private readonly baseUrl = 'https://api.dify.ai/v1';
  private readonly apiKey = process.env.DIFY_API_KEY;

  constructor() {
    if (!this.apiKey) {
      throw AppErrorCodes.INVALID_DIFY_API_KEY;
    }
  }

  async sendChatMessageStream(
    request: ChatMessageRequestDto,
  ): Promise<Readable> {
    try {
      // リクエストボディを構築
      const requestBody = {
        inputs: request.inputs || {},
        query: request.query,
        response_mode: 'streaming',
        conversation_id: request.conversation_id || '',
        user: request.user,
        auto_generate_name: request.auto_generate_name ?? true,
      };

      // オプショナルフィールドの追加
      if (request.files && request.files.length > 0) {
        requestBody['files'] = request.files;
      }
      if (request.workflow_id) {
        requestBody['workflow_id'] = request.workflow_id;
      }
      if (request.trace_id) {
        requestBody['trace_id'] = request.trace_id;
      }

      const response = await fetch(`${this.baseUrl}/chat-messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = {
            message: `HTTP ${response.status}: ${response.statusText}`,
            code: response.status,
          };
        }

        console.error('Dify API error response:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          headers: Object.fromEntries(response.headers.entries()),
        });

        throw AppErrorCodes.DIFY_API_ERROR.setCustomMessage(
          `Dify API error (${response.status}): ${errorData.message || errorData.code || response.statusText}`,
        );
      }

      if (!response.body) {
        throw AppErrorCodes.NO_RESNPONSE_BODY;
      }

      // ReadableStreamを手動でNode.js Readableに変換
      const nodeStream = new Readable({ read() {} });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              nodeStream.push(null);
              break;
            }

            // テキストデータとしてデコード
            const text = decoder.decode(value, { stream: true });
            nodeStream.push(Buffer.from(text, 'utf8'));
          }
        } catch (error) {
          console.error('Stream reading error:', error);
          nodeStream.destroy(error as Error);
        }
      };

      void pump();
      return nodeStream;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw AppErrorCodes.CONNECTION_ERROR.setCustomMessage(
        `Failed to connect to Dify API: ${error.message}`,
      );
    }
  }

  /**
   * SSEストリームを解析してJSON形式で返す
   */
  parseSSEStream(stream: Readable): Readable {
    const parsedStream = new Readable({
      objectMode: true,
      read() {},
    });

    let buffer = '';

    stream.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6).trim();

          if (data === '[DONE]') {
            parsedStream.push(null);
            return;
          }

          if (!data) {
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            if (parsed.event && typeof parsed.event === 'string') {
              parsedStream.push(parsed);
            }
          } catch (error) {
            console.error('Failed to parse SSE data:', {
              data,
              error: error.message,
              line: trimmedLine,
            });
          }
        } else if (trimmedLine.startsWith('event: ')) {
          continue;
        } else if (trimmedLine === '') {
          continue;
        } else if (trimmedLine.startsWith(':')) {
          continue;
        }
      }
    });

    stream.on('end', () => {
      if (buffer.trim()) {
        console.log('Stream ended with remaining buffer:', buffer.trim());
      }
      parsedStream.push(null);
    });

    stream.on('error', (error) => {
      console.error('Source stream error:', error);
      parsedStream.destroy(error);
    });

    return parsedStream;
  }
}
