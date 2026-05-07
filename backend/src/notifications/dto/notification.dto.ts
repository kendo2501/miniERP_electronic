import { IsOptional, IsString, IsInt, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class NotificationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() channel?: string;
}

export class CreateNotificationDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() recipientId?: number;
  @IsString() channel!: string;
  @IsString() notificationType!: string;
  @IsOptional() @IsString() subject?: string;
  @IsString() content!: string;
  @IsOptional() @IsIn(['LOW', 'NORMAL', 'HIGH', 'URGENT']) priority?: string;
}
