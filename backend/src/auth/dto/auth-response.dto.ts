import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty()
  declare accessToken: string;

  @ApiProperty()
  declare refreshToken: string;

  @ApiProperty()
  declare expiresIn: number;
}
