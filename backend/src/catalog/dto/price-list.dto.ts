import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, MaxLength, IsOptional, IsBoolean,
  IsInt, IsPositive, IsNumber, Min, IsDateString, IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePriceListDto {
  @ApiProperty({ example: 'Bảng giá Cấp 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare name: string;

  @ApiPropertyOptional({ example: 'TIER', enum: ['TIER', 'CUSTOMER', 'DEFAULT'] })
  @IsOptional()
  @IsIn(['TIER', 'CUSTOMER', 'DEFAULT'])
  @IsString()
  @MaxLength(50)
  declare applyTo?: string;

  @ApiPropertyOptional({ example: 'Cấp 1' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  declare customerTier?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  declare customerId?: number;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  declare validFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  declare validTo?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  declare isDefault?: boolean;
}

export class CreatePriceListItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  declare productId: number;

  @ApiProperty({ example: 100000 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  declare unitPrice: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.000001)
  declare minQuantity?: number;
}

export class PriceListLookupQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  declare productId: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.000001)
  declare quantity?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  declare customerId?: number;

  @ApiPropertyOptional({ example: 'Cấp 1' })
  @IsOptional()
  @IsString()
  declare customerTier?: string;
}
