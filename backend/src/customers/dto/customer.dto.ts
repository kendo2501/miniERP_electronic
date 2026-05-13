import { IsString, IsOptional, IsNumber, IsInt, IsBoolean, MaxLength, Min, IsIn, MinLength, IsEmail, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCustomerDto {
  @ApiPropertyOptional({ description: 'Leave blank to auto-generate (CUST-XXXXX)' })
  @IsOptional() @IsString() @MaxLength(50) customerCode?: string;

  @ApiProperty() @IsString() @MaxLength(255) companyName!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) contactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\d{9,11}$/, { message: 'Số điện thoại phải gồm 9–11 chữ số' })
  phone?: string;

  @ApiProperty() @IsEmail({}, { message: 'Email không hợp lệ' }) email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  password!: string;

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
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\d{9,11}$/, { message: 'Số điện thoại phải gồm 9–11 chữ số' })
  phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
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

export class CreateAddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) label?: string;
  @ApiProperty() @IsString() address!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdateAddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) label?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class CustomerQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) assignedSalesUserId?: number;
}
