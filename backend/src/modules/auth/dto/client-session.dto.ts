import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ClientSessionDto {
  @ApiPropertyOptional({
    description:
      'Identificador estable del cliente (navegador o instalación). Permite varias sesiones simultáneas.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  clientId?: string;

  @ApiPropertyOptional({ enum: ['web', 'mobile'] })
  @IsOptional()
  @IsIn(['web', 'mobile'])
  platform?: 'web' | 'mobile';
}
