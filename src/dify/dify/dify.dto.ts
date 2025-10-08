import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FileDto {
  @IsString()
  @IsNotEmpty()
  type: 'image' | 'document' | 'audio' | 'video' | 'custom';

  @IsString()
  @IsNotEmpty()
  transfer_method: 'remote_url' | 'local_file';

  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  upload_file_id?: string;
}

export class ChatMessageRequestDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  inputs?: Record<string, any> = {};

  @IsString()
  @IsNotEmpty()
  user: string;

  @IsString()
  @IsOptional()
  conversation_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  @IsOptional()
  files?: FileDto[];

  @IsOptional()
  auto_generate_name?: boolean = true;

  @IsString()
  @IsOptional()
  workflow_id?: string;

  @IsString()
  @IsOptional()
  trace_id?: string;
}

export interface DifyStreamResponse {
  event: string;
  data: any;
}

export interface DifyApiConfig {
  baseUrl: string;
  apiKey: string;
}
