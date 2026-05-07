import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWarehouseDto {
  @ApiProperty() @IsString() @MaxLength(100) code!: string;
  @ApiProperty() @IsString() @MaxLength(255) warehouseName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
}

export class UpdateWarehouseDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) warehouseName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
