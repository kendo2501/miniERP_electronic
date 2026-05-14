import { IsInt, IsNumber, IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ReplenishmentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ReplenishmentPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateReplenishmentDto {
  @ApiProperty() @IsInt() @Type(() => Number) productId!: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) warehouseId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) salesOrderId?: number;
  @ApiProperty() @IsNumber() @Type(() => Number) shortageQuantity!: number;
  @ApiPropertyOptional({ enum: ReplenishmentPriority, default: ReplenishmentPriority.NORMAL })
  @IsOptional() @IsEnum(ReplenishmentPriority) priority?: ReplenishmentPriority;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateReplenishmentDto {
  @ApiPropertyOptional({ enum: ReplenishmentStatus })
  @IsOptional() @IsEnum(ReplenishmentStatus) status?: ReplenishmentStatus;
  @ApiPropertyOptional({ enum: ReplenishmentPriority })
  @IsOptional() @IsEnum(ReplenishmentPriority) priority?: ReplenishmentPriority;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) assignedTo?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ReplenishmentQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() limit?: number;
  @ApiPropertyOptional({ enum: ReplenishmentStatus })
  @IsOptional() @IsEnum(ReplenishmentStatus) status?: ReplenishmentStatus;
  @ApiPropertyOptional({ enum: ReplenishmentPriority })
  @IsOptional() @IsEnum(ReplenishmentPriority) priority?: ReplenishmentPriority;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() productId?: number;
}
