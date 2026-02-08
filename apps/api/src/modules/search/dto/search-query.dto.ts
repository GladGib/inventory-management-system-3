import { IsOptional, IsString, IsEnum, IsInt, Min, Max, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum SearchType {
  ITEMS = 'items',
  CONTACTS = 'contacts',
  ALL = 'all',
}

export class SearchQueryDto {
  @ApiProperty({ description: 'Search query string', example: 'brake pad' })
  @IsString()
  @MinLength(1)
  q: string;

  @ApiPropertyOptional({
    description: 'Type of records to search',
    enum: SearchType,
    default: SearchType.ALL,
  })
  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType = SearchType.ALL;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Results per page',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class SuggestQueryDto {
  @ApiProperty({
    description: 'Autocomplete prefix text',
    example: 'bra',
  })
  @IsString()
  @MinLength(1)
  q: string;

  @ApiPropertyOptional({
    description: 'Type of records to suggest',
    enum: SearchType,
    default: SearchType.ALL,
  })
  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType = SearchType.ALL;

  @ApiPropertyOptional({
    description: 'Number of suggestions to return',
    default: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 7;
}
