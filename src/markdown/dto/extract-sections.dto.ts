import { IsString, IsNotEmpty } from 'class-validator';

export class ExtractSectionsDto {
  @IsString()
  @IsNotEmpty()
  markdown: string;
}

export class SearchSectionsDto {
  @IsString()
  @IsNotEmpty()
  markdown: string;

  @IsString()
  @IsNotEmpty()
  searchTerm: string;
}
