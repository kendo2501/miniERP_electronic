import { IsInt, IsNumber, IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AdjustStockDto {
  @ApiProperty() @IsInt() @Type(() => Number) warehouseId!: number;
  @ApiProperty() @IsInt() @Type(() => Number) productId!: number;
  @ApiProperty({ description: 'Positive to add, negative to remove' })
  @IsNumber() @Type(() => Number) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class TransferStockDto {
  @ApiProperty() @IsInt() @Type(() => Number) fromWarehouseId!: number;
  @ApiProperty() @IsInt() @Type(() => Number) toWarehouseId!: number;
  @ApiProperty() @IsInt() @Type(() => Number) productId!: number;
  @ApiProperty() @IsNumber() @IsNotEmpty() @Type(() => Number) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
