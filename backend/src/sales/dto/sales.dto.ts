import { IsInt, IsString, IsOptional, IsArray, IsNumber, ValidateNested, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ─── Quotation ─────────────────────────────────────────────────────────────

export class QuotationItemDto {
  @ApiProperty() @IsInt() @Type(() => Number) productId!: number;
  @ApiProperty() @IsNumber() @Min(0.01) @Type(() => Number) quantity!: number;
  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) unitPrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) discountAmount?: number;
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
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) discountAmount?: number;
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

// ─── Delivery ─────────────────────────────────────────────────────────────

export class DeliveryItemDto {
  @ApiProperty() @IsInt() @Type(() => Number) productId!: number;
  @ApiProperty() @IsNumber() @Min(0.01) @Type(() => Number) quantity!: number;
}

export class CreateDeliveryDto {
  @ApiProperty() @IsInt() @Type(() => Number) salesOrderId!: number;
  @ApiProperty() @IsInt() @Type(() => Number) warehouseId!: number;
  @ApiProperty({ type: [DeliveryItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => DeliveryItemDto) items!: DeliveryItemDto[];
}

export class DeliveryQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) salesOrderId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
