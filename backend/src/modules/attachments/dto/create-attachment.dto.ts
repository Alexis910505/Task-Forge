import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EvidenceKind } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateAttachmentDto {
  @ApiPropertyOptional({ description: 'URL pública o firmada tras subida a almacenamiento' })
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

  @ApiPropertyOptional({ enum: EvidenceKind })
  @IsOptional()
  @IsEnum(EvidenceKind)
  evidenceKind?: EvidenceKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  capturedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}