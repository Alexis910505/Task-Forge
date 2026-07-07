import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsObject, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class BootstrapOrganizationDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ description: 'Slug único (subdominio / login)' })
  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug: solo minúsculas, números y guiones',
  })
  slug!: string;

  @ApiPropertyOptional()
  @IsEmail()
  adminEmail!: string;

  @ApiPropertyOptional({ minLength: 8 })
  @IsString()
  @MinLength(8)
  adminPassword!: string;

  @ApiPropertyOptional()
  @IsString()
  adminFirstName!: string;

  @ApiPropertyOptional()
  @IsString()
  adminLastName!: string;
}

export class UpdateOrganizationBrandingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accentColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customCss?: string;

  @ApiPropertyOptional({ description: 'JSON arbitrario de configuración tenant' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
