import { IsString, IsNotEmpty } from 'class-validator';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const extractSectionsSchema = z.object({
  markdown: z.string().min(1, 'Markdown content must not be empty'),
});

export class ExtractSectionsDto extends createZodDto(extractSectionsSchema) {}


export const searchSectionsSchema = z.object({
  markdown: z.string().min(1, 'Markdown content must not be empty'),
  searchTerm: z.string().min(1, 'Search term must not be empty'),
});

export class SearchSectionsDto extends createZodDto(searchSectionsSchema) {}