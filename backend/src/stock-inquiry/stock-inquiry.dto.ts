import { IsInt, IsString, IsOptional, IsArray, IsNumber, ValidateNested, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class StockInquiryItemDto {
  @ApiProperty() @IsInt() @Type(() => Number) productId!: number;
  @ApiProperty() @IsNumber() @Min(0.01) @Type(() => Number) requestedQuantity!: number;
}

export class CreateStockInquiryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty({ type: [StockInquiryItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => StockInquiryItemDto) items!: StockInquiryItemDto[];
}

export class RespondInquiryItemDto {
  @ApiProperty() @IsInt() @Type(() => Number) itemId!: number;
  @ApiProperty() @IsBoolean() isAvailable!: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) availableQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseNote?: string;
}

export class RespondStockInquiryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() responseNotes?: string;
  @ApiProperty({ type: [RespondInquiryItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => RespondInquiryItemDto) items!: RespondInquiryItemDto[];
}

export class StockInquiryQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
