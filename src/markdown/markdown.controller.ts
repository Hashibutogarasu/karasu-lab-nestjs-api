import { Body, Controller, Post } from '@nestjs/common';
import { MarkdownService } from './markdown.service';
import type { SectionList, SearchResult } from './markdown.service';
import {
  ExtractSectionsDto,
  SearchSectionsDto,
} from './dto/extract-sections.dto';

@Controller('markdown')
export class MarkdownController {
  constructor(private readonly markdownService: MarkdownService) {}

  /**
   * マークダウンからヘッダーセクション一覧を抽出するエンドポイント
   * @param body マークダウンテキストを含むリクエストボディ
   * @returns ヘッダーレベル別のセクション一覧
   */
  @Post('extract-sections')
  extractSections(@Body() body: ExtractSectionsDto): SectionList {
    return this.markdownService.extractSections(body.markdown);
  }

  /**
   * マークダウンのセクションから指定された文字列を検索するエンドポイント
   * @param body マークダウンテキストと検索文字列を含むリクエストボディ
   * @returns 検索結果の配列
   */
  @Post('search-sections')
  searchSections(@Body() body: SearchSectionsDto): SearchResult[] {
    return this.markdownService.searchSections(body.markdown, body.searchTerm);
  }
}
