import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Supervisor de planta' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ type: [String], example: ['tasks:read', 'tasks:write'] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions?: string[];
}
