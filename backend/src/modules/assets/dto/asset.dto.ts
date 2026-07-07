import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { AssetCategory, AssetStatus } from '@prisma/client';

export class CreateAssetDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ description: 'Código único del activo' })
  @IsString()
  @MinLength(1)
  code!: string;

  @ApiPropertyOptional({ enum: AssetCategory })
  @IsEnum(AssetCategory)
  category!: AssetCategory;

  @ApiPropertyOptional({ enum: AssetStatus })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

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

  @ApiPropertyOptional({ enum: AssetCategory })
  @IsOptional()
  @IsEnum(AssetCategory)
  category?: AssetCategory;

  @ApiPropertyOptional({ enum: AssetStatus })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

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
  @ApiPropertyOptional({ enum: AssetCategory })
  @IsOptional()
  @IsEnum(AssetCategory)
  category?: AssetCategory;

  @ApiPropertyOptional({ enum: AssetStatus })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

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
