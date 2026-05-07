import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class SettingsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scope?: string;
}

export class UpdateSettingDto {
  @ApiProperty() value!: any;
}
