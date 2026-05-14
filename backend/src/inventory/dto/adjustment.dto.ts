import { IsInt, IsNumber, IsString, IsOptional, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum AdjustmentType {
  IN = 'IN',
  OUT = 'OUT',
  DAMAGE = 'DAMAGE',
  RETURN = 'RETURN',
  CORRECTION = 'CORRECTION',
}

export class AdjustStockDto {
  @ApiProperty() @IsInt() @Type(() => Number) warehouseId!: number;
  @ApiProperty() @IsInt() @Type(() => Number) productId!: number;
  @ApiProperty({ description: 'Absolute quantity change (always positive; direction set by adjustmentType)' })
  @IsNumber() @Type(() => Number) quantity!: number;
  @ApiProperty({ enum: AdjustmentType, default: AdjustmentType.IN })
  @IsEnum(AdjustmentType) adjustmentType!: AdjustmentType;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class TransferStockDto {
  @ApiProperty() @IsInt() @Type(() => Number) fromWarehouseId!: number;
  @ApiProperty() @IsInt() @Type(() => Number) toWarehouseId!: number;
  @ApiProperty() @IsInt() @Type(() => Number) productId!: number;
  @ApiProperty() @IsNumber() @IsNotEmpty() @Type(() => Number) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
