import { IsString, IsOptional, IsNumber, IsInt, MaxLength, Min, IsIn, MinLength, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCustomerDto {
  @ApiProperty() @IsString() @MaxLength(255) companyName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) contactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) taxCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) creditLimit?: number;
  @ApiPropertyOptional({ enum: ['RETAIL', 'WHOLESALE'] }) @IsOptional() @IsIn(['RETAIL', 'WHOLESALE']) customerType?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) assignedSalesUserId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) organizationId?: number;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) companyName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) contactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) taxCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) creditLimit?: number;
  @ApiPropertyOptional({ enum: ['RETAIL', 'WHOLESALE'] }) @IsOptional() @IsIn(['RETAIL', 'WHOLESALE']) customerType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) assignedSalesUserId?: number;
}

export class CreatePortalAccountDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() @MinLength(8) password!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) fullName?: string;
}

export class CustomerQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) assignedSalesUserId?: number;
}
