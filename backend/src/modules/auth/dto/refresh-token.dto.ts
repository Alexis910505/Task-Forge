import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'JWT de refresh emitido en login' })
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}
