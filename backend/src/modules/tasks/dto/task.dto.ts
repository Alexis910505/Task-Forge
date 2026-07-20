import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { TaskPriority, TaskStatus } from '@prisma/client';

export class CreateTaskDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Obligatorio salvo al crear subtarea (se hereda del padre)' })
  @ValidateIf((o: CreateTaskDto) => !o.parentTaskId)
  @IsString()
  boardId?: string;

  @ApiPropertyOptional({ description: 'Tarea padre; la subtarea hereda boardId y no aparece en el kanban' })
  @IsOptional()
  @IsString()
  parentTaskId?: string;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ enum: TaskStatus, description: 'Estado inicial; por defecto TODO' })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'IDs de assets a asociar al crear la tarea' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  assetIds?: string[];
}

export class UpdateTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class MoveTaskDto {
  @ApiPropertyOptional({ enum: TaskStatus })
  @IsEnum(TaskStatus)
  status!: TaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class ListTasksQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  boardId?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({
    description:
      'Cola de trabajo del usuario en TODOS los proyectos: asignadas a él + sin asignar. Ignora boardId.',
  })
  @IsOptional()
  @IsString()
  worklistFor?: string;

  @ApiPropertyOptional({
    description:
      'Con assigneeId: incluir también tareas sin asignar (visibles para todos)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  includeUnassigned?: boolean;

  @ApiPropertyOptional({ description: 'Búsqueda por título' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Filtrar subtareas de una tarea padre' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({
    description:
      'Solo tareas raíz (sin padre). Por defecto true en listados generales; false si se filtra por assigneeId',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  rootOnly?: boolean;
}
