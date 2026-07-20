import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiPropertyOptional()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional()
  @IsString()
  firstName!: string;

  @ApiPropertyOptional()
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ description: 'ID del rol en base de datos' })
  @IsString()
  roleId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ enum: EmploymentType, default: EmploymentType.FULL_TIME })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;
}
