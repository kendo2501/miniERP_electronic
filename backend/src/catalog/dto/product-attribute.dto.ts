import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductAttributeDto {
  @ApiProperty({ example: 'Công suất' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare attrKey: string;

  @ApiProperty({ example: '18W' })
  @IsString()
  @IsNotEmpty()
  declare attrValue: string;
}

export class UpsertProductAttributesDto {
  @ApiProperty({ type: [ProductAttributeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeDto)
  declare attributes: ProductAttributeDto[];
}
