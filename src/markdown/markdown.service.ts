import { Injectable } from '@nestjs/common';

export interface SectionList {
  h1: string[];
  h2: string[];
  h3: string[];
  h4: string[];
}

export interface SearchResult {
  level: 'h1' | 'h2' | 'h3' | 'h4';
  text: string;
  index: number;
}

@Injectable()
export class MarkdownService {
  /**
   * マークダウンテキストからヘッダーセクション一覧を抽出
   */
  extractSections(markdown: string): SectionList {
    const sections: SectionList = {
      h1: [],
      h2: [],
      h3: [],
      h4: [],
    };

    // マークダウンを行ごとに分割
    const lines = markdown.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // ヘッダー行を検出
      if (trimmedLine.startsWith('#')) {
        const match = trimmedLine.match(/^(#{1,4})\s+(.+)$/);
        if (match) {
          const headerLevel = match[1].length;
          const headerText = match[2].trim();

          // マークダウン記法を除去（**bold**, *italic*, `code`など）
          const cleanText = this.cleanMarkdownText(headerText);

          switch (headerLevel) {
            case 1:
              sections.h1.push(cleanText);
              break;
            case 2:
              sections.h2.push(cleanText);
              break;
            case 3:
              sections.h3.push(cleanText);
              break;
            case 4:
              sections.h4.push(cleanText);
              break;
          }
        }
      }
    }

    return sections;
  }

  /**
   * セクション一覧から指定された文字列を検索
   */
  searchSections(markdown: string, searchTerm: string): SearchResult[] {
    const sections = this.extractSections(markdown);
    const results: SearchResult[] = [];
    const searchLower = searchTerm.toLowerCase();

    // 各レベルのセクションを検索
    const levels: Array<keyof SectionList> = ['h1', 'h2', 'h3', 'h4'];

    levels.forEach((level) => {
      sections[level].forEach((text, index) => {
        if (text.toLowerCase().includes(searchLower)) {
          results.push({
            level,
            text,
            index,
          });
        }
      });
    });

    return results;
  }

  /**
   * マークダウンの装飾記法を除去してプレーンテキストを取得
   */
  private cleanMarkdownText(text: string): string {
    return (
      text
        // **bold** と __bold__ を除去
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        // *italic* と _italic_ を除去
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/_(.*?)_/g, '$1')
        // `code` を除去
        .replace(/`(.*?)`/g, '$1')
        // [link text](url) から link text のみを抽出
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // ![alt text](image url) から alt text のみを抽出
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        // 余分な空白を除去
        .replace(/\s+/g, ' ')
        .trim()
    );
  }
}
