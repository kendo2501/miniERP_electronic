import { IsOptional, IsInt, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class StockQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) warehouseId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) productId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() @Transform(({ value }) => value === 'true' || value === true) lowStockOnly?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) lowStockThreshold?: number = 10;
}

export class TransactionQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) warehouseId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) productId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() transactionType?: string;
}
