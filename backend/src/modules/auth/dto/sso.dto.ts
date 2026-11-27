import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ClientSessionDto } from './client-session.dto';

export class MicrosoftStartQueryDto {
  @ApiPropertyOptional({ default: 'default' })
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  org?: string;

  @ApiPropertyOptional({ enum: ['web', 'mobile'], default: 'web' })
  @IsOptional()
  @IsIn(['web', 'mobile'])
  platform?: 'web' | 'mobile';

  @ApiPropertyOptional({ description: 'Token del enlace de invitación' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  invite?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  clientId?: string;
}

export class MicrosoftExchangeDto {
  @ApiProperty({ description: 'Código de un solo uso recibido tras entrar con Microsoft' })
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  code!: string;
}

export class AcceptInvitationDto extends ClientSessionDto {
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;
}
