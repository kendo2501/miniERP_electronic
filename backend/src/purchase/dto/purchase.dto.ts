import { IsString, IsOptional, IsInt, IsArray, IsPositive, IsNumber, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ─── Purchase Request ────────────────────────────────────────────────────────

export class CreatePRItemDto {
  @ApiProperty() @IsInt() @IsPositive() productId!: number;
  @ApiProperty({ minimum: 1 }) @IsNumber() @Min(1) @Type(() => Number) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) estimatedUnitPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreatePurchaseRequestDto {
  @ApiProperty({ type: [CreatePRItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreatePRItemDto)
  items!: CreatePRItemDto[];

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class RejectPRDto {
  @ApiProperty() @IsString() reason!: string;
}

export class PRQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() status?: string;
}

// ─── RFQ ────────────────────────────────────────────────────────────────────

export class CreateRFQItemDto {
  @ApiProperty() @IsInt() @IsPositive() productId!: number;
  @ApiProperty({ minimum: 1 }) @IsNumber() @Min(1) @Type(() => Number) quantity!: number;
}

export class CreateRFQDto {
  @ApiProperty({ type: [CreateRFQItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateRFQItemDto)
  items!: CreateRFQItemDto[];

  @ApiProperty({ type: [Number] }) @IsArray() @IsInt({ each: true }) supplierIds!: number[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class SubmitQuoteItemDto {
  @ApiProperty() @IsInt() @IsPositive() productId!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) unitPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) deliveryDays?: number;
}

export class SubmitRFQQuoteDto {
  @ApiProperty() @IsInt() @IsPositive() supplierId!: number;
  @ApiProperty({ type: [SubmitQuoteItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => SubmitQuoteItemDto)
  items!: SubmitQuoteItemDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class SelectRFQWinnerDto {
  @ApiProperty() @IsInt() @IsPositive() supplierId!: number;
}

export class RFQQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() status?: string;
}

// ─── Purchase Order ──────────────────────────────────────────────────────────

export class CreatePOItemDto {
  @ApiProperty() @IsInt() @IsPositive() productId!: number;
  @ApiProperty({ minimum: 1 }) @IsNumber() @Min(1) @Type(() => Number) quantity!: number;
  @ApiProperty({ minimum: 0 }) @IsNumber() @Min(0) @Type(() => Number) unitPrice!: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty() @IsInt() @IsPositive() supplierId!: number;
  @ApiProperty({ type: [CreatePOItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreatePOItemDto)
  items!: CreatePOItemDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() expectedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CancelPODto {
  @ApiProperty() @IsString() reason!: string;
}

export class POQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) supplierId?: number;
}

// ─── Goods Receipt ───────────────────────────────────────────────────────────

export class CreateGRNItemDto {
  @ApiProperty() @IsInt() @IsPositive() productId!: number;
  @ApiProperty({ minimum: 0.001 }) @IsNumber() @Min(0.001) @Type(() => Number) quantity!: number;
}

export class CreateGoodsReceiptDto {
  @ApiProperty() @IsInt() @IsPositive() purchaseOrderId!: number;
  @ApiProperty() @IsInt() @IsPositive() warehouseId!: number;
  @ApiProperty({ type: [CreateGRNItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateGRNItemDto)
  items!: CreateGRNItemDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class GRNQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) purchaseOrderId?: number;
  @ApiPropertyOptional() @IsOptional() status?: string;
}

// ─── Purchase Invoice ────────────────────────────────────────────────────────

export class CreatePurchaseInvoiceDto {
  @ApiProperty() @IsInt() @IsPositive() purchaseOrderId!: number;
  @ApiProperty() @IsString() invoiceNumber!: string;
  @ApiProperty({ minimum: 0 }) @IsNumber() @Min(0) @Type(() => Number) totalAmount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class PurchaseInvoiceQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) supplierId?: number;
}

// ─── Supplier Payment ────────────────────────────────────────────────────────

export class CreateSupplierPaymentDto {
  @ApiProperty() @IsInt() @IsPositive() supplierId!: number;
  @ApiProperty({ minimum: 0.01 }) @IsNumber() @Min(0.01) @Type(() => Number) totalAmount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class SupplierPaymentQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) supplierId?: number;
  @ApiPropertyOptional() @IsOptional() status?: string;
}
