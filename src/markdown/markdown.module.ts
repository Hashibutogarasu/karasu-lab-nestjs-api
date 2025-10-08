import { Module } from '@nestjs/common';
import { MarkdownService } from './markdown.service';
import { MarkdownController } from './markdown.controller';

@Module({
  providers: [MarkdownService],
  controllers: [MarkdownController],
})
export class MarkdownModule {}
