import { IsInt, IsArray, IsNumber, Min, IsOptional, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateStockCountDto {
  @ApiProperty() @IsInt() @IsPositive() warehouseId!: number;
  @ApiProperty({ type: [Number] }) @IsArray() @IsInt({ each: true }) productIds!: number[];
}

export class UpdateStockCountItemDto {
  @ApiProperty() @IsInt() @IsPositive() productId!: number;
  @ApiProperty({ minimum: 0 }) @IsNumber() @Min(0) @Type(() => Number) countedQuantity!: number;
}

export class UpdateStockCountItemsDto {
  @ApiProperty({ type: [UpdateStockCountItemDto] })
  @IsArray()
  @Type(() => UpdateStockCountItemDto)
  items!: UpdateStockCountItemDto[];
}

export class StockCountQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) warehouseId?: number;
  @ApiPropertyOptional() @IsOptional() status?: string;
}
