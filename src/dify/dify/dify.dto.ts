import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import z from 'zod';
import { createZodDto } from 'nestjs-zod';

export const fileSchema = z.object({
  type: z.enum(['image', 'document', 'audio', 'video', 'custom']),
  transfer_method: z.enum(['remote_url', 'local_file']),
  url: z.string().optional(),
  upload_file_id: z.string().optional(),
});

export class FileDto extends createZodDto(fileSchema) {}

export const chatMessageRequestSchema = z.object({
  query: z.string().min(1, 'Query must not be empty'),
  inputs: z.record(z.string(), z.any()).optional().default({}),
  user: z.string().min(1, 'User must not be empty'),
  conversation_id: z.string().optional(),
  files: z.array(fileSchema).optional(),
  auto_generate_name: z.boolean().optional().default(true),
  workflow_id: z.string().optional(),
  trace_id: z.string().optional(),
});

export class ChatMessageRequestDto extends createZodDto(
  chatMessageRequestSchema,
) {}

export const difyStreamResponseSchema = z.object({
  event: z.string(),
  data: z.any(),
});

export class DifyStreamResponse extends createZodDto(
  difyStreamResponseSchema,
) {}

export const difyApiConfigSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string(),
});

export class DifyApiConfig extends createZodDto(difyApiConfigSchema) {}
