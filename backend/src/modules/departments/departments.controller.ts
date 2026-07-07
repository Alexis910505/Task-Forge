import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { RequirePermissions } from '../../core/decorators/permissions.decorator';
import type { Request } from 'express';
import { RequestUser } from '../../core/strategies/jwt.strategy';

@ApiTags('departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Get()
  @RequirePermissions('departments:read')
  @ApiOperation({ summary: 'Listar departamentos' })
  findAll(@Req() req: Request & { user: RequestUser }) {
    return this.departments.findAll(req.user.organizationId);
  }

  @Post()
  @RequirePermissions('departments:write')
  @ApiOperation({ summary: 'Crear departamento' })
  create(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateDepartmentDto) {
    return this.departments.create(req.user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions('departments:write')
  @ApiOperation({ summary: 'Actualizar departamento' })
  update(
    @Req() req: Request & { user: RequestUser },
    @Param('id') id: string,
    @Body() dto: Partial<CreateDepartmentDto>,
  ) {
    return this.departments.update(req.user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('departments:write')
  @ApiOperation({ summary: 'Eliminar departamento' })
  remove(@Req() req: Request & { user: RequestUser }, @Param('id') id: string) {
    return this.departments.remove(req.user.organizationId, id);
  }
}
