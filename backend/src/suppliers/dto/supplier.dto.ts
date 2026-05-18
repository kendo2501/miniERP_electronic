import { IsString, IsOptional, IsNumber, IsInt, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSupplierDto {
  @ApiProperty() @IsString() @MaxLength(255) companyName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) contactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) taxCode?: string;
  @ApiPropertyOptional({ minimum: 0, maximum: 5 }) @IsOptional() @IsInt() @Min(0) @Max(5) @Type(() => Number) rating?: number;
}

export class UpdateSupplierDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) companyName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) contactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) taxCode?: string;
  @ApiPropertyOptional({ minimum: 0, maximum: 5 }) @IsOptional() @IsInt() @Min(0) @Max(5) @Type(() => Number) rating?: number;
  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] }) @IsOptional() @IsString() status?: string;
}

export class SupplierQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
