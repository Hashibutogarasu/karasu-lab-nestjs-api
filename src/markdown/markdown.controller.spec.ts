import { Test, TestingModule } from '@nestjs/testing';
import { MarkdownController } from './markdown.controller';
import { MarkdownService } from './markdown.service';

describe('MarkdownController', () => {
  let controller: MarkdownController;
  let service: MarkdownService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarkdownController],
      providers: [MarkdownService],
    }).compile();

    controller = module.get<MarkdownController>(MarkdownController);
    service = module.get<MarkdownService>(MarkdownService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('extractSections', () => {
    it('should extract h1 sections correctly', () => {
      const markdown = `
# First Header
# Second Header
# Third Header
`;
      const result = controller.extractSections({ markdown });

      expect(result.h1).toEqual([
        'First Header',
        'Second Header',
        'Third Header',
      ]);
      expect(result.h2).toEqual([]);
      expect(result.h3).toEqual([]);
      expect(result.h4).toEqual([]);
    });

    it('should extract h2 sections correctly', () => {
      const markdown = `
## Introduction
## Methods
## Conclusion
`;
      const result = controller.extractSections({ markdown });

      expect(result.h1).toEqual([]);
      expect(result.h2).toEqual(['Introduction', 'Methods', 'Conclusion']);
      expect(result.h3).toEqual([]);
      expect(result.h4).toEqual([]);
    });

    it('should extract h3 sections correctly', () => {
      const markdown = `
### Step 1
### Step 2
### Step 3
`;
      const result = controller.extractSections({ markdown });

      expect(result.h1).toEqual([]);
      expect(result.h2).toEqual([]);
      expect(result.h3).toEqual(['Step 1', 'Step 2', 'Step 3']);
      expect(result.h4).toEqual([]);
    });

    it('should extract h4 sections correctly', () => {
      const markdown = `
#### Detail A
#### Detail B
#### Detail C
`;
      const result = controller.extractSections({ markdown });

      expect(result.h1).toEqual([]);
      expect(result.h2).toEqual([]);
      expect(result.h3).toEqual([]);
      expect(result.h4).toEqual(['Detail A', 'Detail B', 'Detail C']);
    });

    it('should extract mixed header levels correctly', () => {
      const markdown = `
# Main Title

## Section 1
### Subsection 1.1
#### Detail 1.1.1
#### Detail 1.1.2

### Subsection 1.2

## Section 2
### Subsection 2.1
#### Detail 2.1.1

# Another Main Title

## Final Section
`;
      const result = controller.extractSections({ markdown });

      expect(result.h1).toEqual(['Main Title', 'Another Main Title']);
      expect(result.h2).toEqual(['Section 1', 'Section 2', 'Final Section']);
      expect(result.h3).toEqual([
        'Subsection 1.1',
        'Subsection 1.2',
        'Subsection 2.1',
      ]);
      expect(result.h4).toEqual([
        'Detail 1.1.1',
        'Detail 1.1.2',
        'Detail 2.1.1',
      ]);
    });

    it('should handle empty markdown', () => {
      const markdown = '';
      const result = controller.extractSections({ markdown });

      expect(result.h1).toEqual([]);
      expect(result.h2).toEqual([]);
      expect(result.h3).toEqual([]);
      expect(result.h4).toEqual([]);
    });

    it('should handle markdown with no headers', () => {
      const markdown = `
This is just regular text.

With some paragraphs.

But no headers at all.
`;
      const result = controller.extractSections({ markdown });

      expect(result.h1).toEqual([]);
      expect(result.h2).toEqual([]);
      expect(result.h3).toEqual([]);
      expect(result.h4).toEqual([]);
    });

    it('should handle headers with complex text', () => {
      const markdown = `
# Header with **bold** text
## Header with *italic* and **bold**
### Header with numbers 123 and symbols !@#
#### Header with unicode characters: 日本語
`;
      const result = controller.extractSections({ markdown });

      // remarkは基本的にプレーンテキストを抽出するため、マークダウン記法は除去される
      expect(result.h1).toEqual(['Header with bold text']);
      expect(result.h2).toEqual(['Header with italic and bold']);
      expect(result.h3).toEqual(['Header with numbers 123 and symbols !@#']);
      expect(result.h4).toEqual(['Header with unicode characters: 日本語']);
    });

    it('should handle multiple header symbols in same line', () => {
      const markdown = `
# test ## section
## foo
`;
      const result = controller.extractSections({ markdown });

      expect(result.h1).toEqual(['test ## section']);
      expect(result.h2).toEqual(['foo']);
      expect(result.h3).toEqual([]);
      expect(result.h4).toEqual([]);
    });
  });

  describe('searchSections', () => {
    const testMarkdown = `
# Introduction to JavaScript
## Variables and Functions
### Variable Declaration
#### let and const keywords
# Advanced Topics
## Async Programming
### Promises and Callbacks
#### Error Handling
## Testing Framework
### Unit Testing
`;

    it('should find sections containing search term (case insensitive)', () => {
      const result = controller.searchSections({
        markdown: testMarkdown,
        searchTerm: 'test',
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        level: 'h2',
        text: 'Testing Framework',
        index: 2,
      });
      expect(result[1]).toEqual({
        level: 'h3',
        text: 'Unit Testing',
        index: 2,
      });
    });

    it('should find sections with exact match', () => {
      const result = controller.searchSections({
        markdown: testMarkdown,
        searchTerm: 'Variables',
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        level: 'h2',
        text: 'Variables and Functions',
        index: 0,
      });
    });

    it('should find sections across different levels', () => {
      const result = controller.searchSections({
        markdown: testMarkdown,
        searchTerm: 'async',
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        level: 'h2',
        text: 'Async Programming',
        index: 1,
      });
    });

    it('should return empty array when no matches found', () => {
      const result = controller.searchSections({
        markdown: testMarkdown,
        searchTerm: 'nonexistent',
      });

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should handle partial word matches', () => {
      const result = controller.searchSections({
        markdown: testMarkdown,
        searchTerm: 'hand',
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        level: 'h4',
        text: 'Error Handling',
        index: 1,
      });
    });

    it('should handle empty search term', () => {
      const result = controller.searchSections({
        markdown: testMarkdown,
        searchTerm: '',
      });

      // 空文字列は全てのセクションにマッチするため、全セクションが返される
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle search in empty markdown', () => {
      const result = controller.searchSections({
        markdown: '',
        searchTerm: 'test',
      });

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });
  });
});
