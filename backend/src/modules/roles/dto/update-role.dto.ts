import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Supervisor de planta' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions?: string[];
}
