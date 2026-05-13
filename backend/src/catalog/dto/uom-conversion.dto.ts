import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UomConversionDto {
  @ApiProperty({ example: 'thùng' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  declare fromUnit: string;

  @ApiProperty({ example: 'cái' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  declare toUnit: string;

  @ApiProperty({ example: 20 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.000001)
  declare conversionRate: number;
}

export class UpsertUomConversionsDto {
  @ApiProperty({ type: [UomConversionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UomConversionDto)
  declare conversions: UomConversionDto[];
}
