import {
  IsInt, IsString, IsOptional, IsArray, IsNumber,
  ValidateNested, IsDateString, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ─── Invoice ──────────────────────────────────────────────────────────────────

export class CreateInvoiceDto {
  @ApiProperty() @IsInt() @Type(() => Number) customerId!: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) salesOrderId?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() issueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) subtotal!: number;
  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) taxAmount!: number;
  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) totalAmount!: number;
}

export class InvoiceQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) customerId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export class CreatePaymentDto {
  @ApiProperty() @IsInt() @Type(() => Number) customerId!: number;
  @ApiProperty() @IsNumber() @Min(0.01) @Type(() => Number) totalAmount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() paymentDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class PaymentQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) customerId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

// ─── Payment Allocation ───────────────────────────────────────────────────────

export class AllocationItemDto {
  @ApiProperty() @IsInt() @Type(() => Number) invoiceId!: number;
  @ApiProperty() @IsNumber() @Min(0.01) @Type(() => Number) allocatedAmount!: number;
}

export class AllocatePaymentDto {
  @ApiProperty({ type: [AllocationItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => AllocationItemDto)
  allocations!: AllocationItemDto[];
}

// ─── AR Ledger ────────────────────────────────────────────────────────────────

export class ArLedgerQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) customerId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() transactionType?: string;
}

// ─── Outstanding / Aging ──────────────────────────────────────────────────────

export class OutstandingQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) customerId?: number;
}
