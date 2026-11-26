import { plainToInstance } from 'class-transformer';
import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, ValidateIf, validateSync } from 'class-validator';

export class EnvironmentVariables {
  @IsOptional()
  @IsEnum(['development', 'production', 'test'])
  NODE_ENV: 'development' | 'production' | 'test' = 'development';

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsOptional()
  @IsString()
  PORT?: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_EXPIRES?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRES?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  /** `false` deshabilita /auth/register y /organizations/bootstrap. */
  @IsOptional()
  @IsIn(['true', 'false'])
  PUBLIC_SIGNUP?: string;

  @IsOptional()
  @IsIn(['local', 's3'])
  STORAGE_DRIVER?: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_DRIVER === 's3')
  @IsString()
  @IsNotEmpty()
  S3_ENDPOINT?: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_DRIVER === 's3')
  @IsString()
  @IsNotEmpty()
  S3_REGION?: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_DRIVER === 's3')
  @IsString()
  @IsNotEmpty()
  S3_BUCKET?: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_DRIVER === 's3')
  @IsString()
  @IsNotEmpty()
  S3_ACCESS_KEY_ID?: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_DRIVER === 's3')
  @IsString()
  @IsNotEmpty()
  S3_SECRET_ACCESS_KEY?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: false,
    forbidUnknownValues: false,
  });
  if (errors.length > 0) {
    const msg = errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('; ');
    throw new Error(`Configuración de entorno inválida: ${msg}`);
  }
  const isProd = validated.NODE_ENV === 'production';
  if (isProd && validated.JWT_ACCESS_SECRET.length < 32) {
    throw new Error('JWT_ACCESS_SECRET debe tener al menos 32 caracteres en producción');
  }
  if (isProd && validated.JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT_REFRESH_SECRET debe tener al menos 32 caracteres en producción');
  }
  return validated;
}
