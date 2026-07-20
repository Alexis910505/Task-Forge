import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { RequirePermissions } from '../../core/decorators/permissions.decorator';
import type { Request } from 'express';
import { RequestUser } from '../../core/strategies/jwt.strategy';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @RequirePermissions('projects:read')
  @ApiOperation({ summary: 'Listar proyectos' })
  findAll(@Req() req: Request & { user: RequestUser }) {
    return this.projects.findAll(req.user);
  }

  @Post()
  @RequirePermissions('projects:write')
  @ApiOperation({ summary: 'Crear proyecto' })
  create(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateProjectDto) {
    return this.projects.create(req.user, dto);
  }

  @Get(':id')
  @RequirePermissions('projects:read')
  @ApiOperation({ summary: 'Detalle de proyecto con tableros' })
  findOne(@Req() req: Request & { user: RequestUser }, @Param('id') id: string) {
    return this.projects.findOne(req.user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('projects:write')
  @ApiOperation({ summary: 'Actualizar proyecto' })
  update(
    @Req() req: Request & { user: RequestUser },
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(req.user, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('projects:write')
  @ApiOperation({ summary: 'Eliminar proyecto y su tablero' })
  remove(@Req() req: Request & { user: RequestUser }, @Param('id') id: string) {
    return this.projects.remove(req.user, id);
  }
}
