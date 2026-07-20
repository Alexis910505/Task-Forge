import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAssetDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ description: 'Código único del activo' })
  @IsString()
  @MinLength(1)
  code!: string;

  @ApiPropertyOptional({ description: 'Código de categoría del catálogo' })
  @IsString()
  @MinLength(1)
  category!: string;

  @ApiPropertyOptional({ description: 'Código de estado del catálogo' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maintenanceDate?: string;
}

export class UpdateAssetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  code?: string;

  @ApiPropertyOptional({ description: 'Código de categoría del catálogo' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Código de estado del catálogo' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'ISO date o vacío para limpiar' })
  @IsOptional()
  @IsString()
  maintenanceDate?: string;
}

export class ListAssetsQueryDto {
  @ApiPropertyOptional({ description: 'Código de categoría del catálogo' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Código de estado del catálogo' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Buscar en nombre o código' })
  @IsOptional()
  @IsString()
  q?: string;
}

export class AddAssetPhotoDto {
  @ApiPropertyOptional()
  @IsString()
  url!: string;

  @ApiPropertyOptional()
  @IsString()
  filename!: string;

  @ApiPropertyOptional()
  @IsString()
  mimeType!: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  size!: number;
}

export class CreateAssetCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @Matches(/^[A-Z0-9_]+$/)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateAssetCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateAssetStatusDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @Matches(/^[A-Z0-9_]+$/)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateAssetStatusDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
