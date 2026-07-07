import { EvidenceKind } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional } from 'class-validator';

export class UploadEvidenceDto {
  @IsEnum(EvidenceKind)
  evidenceKind!: EvidenceKind;

  @IsOptional()
  @IsDateString()
  capturedAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}
