import { IsInt, IsString, IsOptional, IsArray, IsNumber, ValidateNested, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ─── Quotation ─────────────────────────────────────────────────────────────

export class QuotationItemDto {
  @ApiProperty() @IsInt() @Type(() => Number) productId!: number;
  @ApiProperty() @IsNumber() @Min(0.01) @Type(() => Number) quantity!: number;
  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) unitPrice!: number;
  @ApiPropertyOptional({ description: 'Chiết khấu % (0–100)' })
  @IsOptional() @IsNumber() @Min(0) @Max(100) @Type(() => Number) discountPercent?: number;
}

export class CreateQuotationDto {
  @ApiProperty() @IsInt() @Type(() => Number) customerId!: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) salesUserId?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validUntil?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty({ type: [QuotationItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => QuotationItemDto) items!: QuotationItemDto[];
}

export class QuotationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) customerId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

// ─── Sales Order ──────────────────────────────────────────────────────────

export class SalesOrderItemDto {
  @ApiProperty() @IsInt() @Type(() => Number) productId!: number;
  @ApiProperty() @IsNumber() @Min(0.01) @Type(() => Number) quantity!: number;
  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) unitPrice!: number;
  @ApiPropertyOptional({ description: 'Chiết khấu % (0–100)' })
  @IsOptional() @IsNumber() @Min(0) @Max(100) @Type(() => Number) discountPercent?: number;
}

export class CreateSalesOrderDto {
  @ApiProperty() @IsInt() @Type(() => Number) customerId!: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) quotationId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) salesUserId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty({ type: [SalesOrderItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => SalesOrderItemDto) items!: SalesOrderItemDto[];
}

export class SalesOrderQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) customerId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

// ─── Quotation Approval Flow ─────────────────────────────────────────────

export class CancelWithReasonDto {
  @ApiProperty() @IsString() reason!: string;
}

export class RequestRevisionDto {
  @ApiProperty() @IsString() reason!: string;
}

export class UpdateQuotationItemsDto {
  @ApiProperty({ type: [QuotationItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => QuotationItemDto) items!: QuotationItemDto[];
}

// ─── Counter Offer ────────────────────────────────────────────────────────

export class SubmitCounterOfferDto {
  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) proposedAmount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

// ─── Order Price Adjustment ───────────────────────────────────────────────

export class RequestPriceAdjustmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class AdjustOrderPricesDto {
  @ApiProperty({ type: [SalesOrderItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => SalesOrderItemDto) items!: SalesOrderItemDto[];
}
