import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({
    description:
      'Si se envía, solo se invalida esta sesión (p. ej. pestaña web o app móvil). Sin él, se cierran todas las sesiones.',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  refreshToken?: string;
}
