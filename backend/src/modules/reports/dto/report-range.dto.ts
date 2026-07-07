import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class ReportRangeDto {
  @ApiPropertyOptional({ description: 'Inicio del periodo (ISO 8601). Por defecto: hace 30 días.' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Fin del periodo (ISO 8601). Por defecto: hoy 23:59.' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
