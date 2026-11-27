import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Fecha local del usuario, p. ej. 2026-11-27. */
export const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class RoutineItemInputDto {
  @ApiPropertyOptional({ description: 'Id del paso existente; vacío para un paso nuevo' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;
}

export class CreateRoutineDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'true = solo para mí; false = compartida (requiere permiso tasks:assign)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  personal?: boolean;

  @ApiProperty({ description: 'Días ISO: 1 = lunes … 7 = domingo', example: [1, 2, 3, 4, 5] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  weekdays!: number[];

  @ApiProperty({ type: [RoutineItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RoutineItemInputDto)
  items!: RoutineItemInputDto[];

  @ApiPropertyOptional({ description: 'Usuarios que deben cumplirla (solo compartidas). Vacío = todos.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  assigneeIds?: string[];
}

export class UpdateRoutineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  weekdays?: number[];

  @ApiPropertyOptional({
    type: [RoutineItemInputDto],
    description: 'Lista completa: los pasos que falten se quitan (su historial se conserva)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RoutineItemInputDto)
  items?: RoutineItemInputDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  assigneeIds?: string[];
}

export class RoutineDateQueryDto {
  @ApiProperty({ description: 'Fecha local del usuario (YYYY-MM-DD)', example: '2026-11-27' })
  @Matches(LOCAL_DATE_RE)
  date!: string;
}

export class CheckRoutineItemDto {
  @ApiProperty({ description: 'Fecha local del usuario (YYYY-MM-DD)' })
  @Matches(LOCAL_DATE_RE)
  date!: string;

  @ApiProperty()
  @IsString()
  itemId!: string;

  @ApiProperty({ description: 'true = marcar hecho; false = desmarcar' })
  @IsBoolean()
  checked!: boolean;
}
