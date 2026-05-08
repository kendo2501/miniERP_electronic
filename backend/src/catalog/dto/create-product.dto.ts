import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsInt, IsBoolean,
  IsDecimal, MaxLength, IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  declare sku: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  declare productName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional({ type: String, example: '100.00' })
  @IsOptional()
  @IsDecimal()
  standardPrice?: string;

  @ApiPropertyOptional({ type: String, example: '80.00' })
  @IsOptional()
  @IsDecimal()
  minPrice?: string;

  @ApiPropertyOptional({ type: String, example: '0.5' })
  @IsOptional()
  @IsDecimal()
  weight?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  brandId?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];
}
