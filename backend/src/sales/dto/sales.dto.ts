import { IsInt, IsString, IsOptional, IsArray, IsNumber, ValidateNested, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ─── Quotation ─────────────────────────────────────────────────────────────

export class QuotationItemDto {
  @ApiProperty() @IsInt() @Type(() => Number) productId!: number;
  @ApiProperty() @IsNumber() @Min(0.01) @Type(() => Number) quantity!: number;
  @ApiPropertyOptional({ description: 'Unit price. If omitted, auto-looked up from price lists.' })
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) unitPrice?: number;
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

export class QuotationItemWithPriceDto {
  @ApiProperty() @IsInt() @Type(() => Number) productId!: number;
  @ApiProperty() @IsNumber() @Min(0.01) @Type(() => Number) quantity!: number;
  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) unitPrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) @Type(() => Number) discountPercent?: number;
}

export class UpdateQuotationItemsDto {
  @ApiProperty({ type: [QuotationItemWithPriceDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => QuotationItemWithPriceDto) items!: QuotationItemWithPriceDto[];
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

// ─── Sales Returns ────────────────────────────────────────────────────────

export class SalesReturnItemDto {
  @ApiProperty() @IsInt() @Type(() => Number) productId!: number;
  @ApiProperty({ minimum: 0.001 }) @IsNumber() @Min(0.001) @Type(() => Number) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) warehouseId?: number;
}

export class CreateSalesReturnDto {
  @ApiProperty() @IsInt() @Type(() => Number) salesOrderId!: number;
  @ApiProperty({ type: [SalesReturnItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => SalesReturnItemDto) items!: SalesReturnItemDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class RejectReturnDto {
  @ApiProperty() @IsString() reason!: string;
}

export class SalesReturnQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) salesOrderId?: number;
}
