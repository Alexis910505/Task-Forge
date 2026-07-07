import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, ListTasksQueryDto, MoveTaskDto, UpdateTaskDto } from './dto/task.dto';
import { LinkTaskAssetsDto } from './dto/task-assets.dto';
import { RequirePermissions } from '../../core/decorators/permissions.decorator';
import type { Request } from 'express';
import { RequestUser } from '../../core/strategies/jwt.strategy';
import { ActivityService } from '../activity/activity.service';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasks: TasksService,
    private readonly activity: ActivityService,
  ) {}

  @Get()
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Listar tareas con filtros y búsqueda' })
  list(@Req() req: Request & { user: RequestUser }, @Query() query: ListTasksQueryDto) {
    return this.tasks.list(req.user.organizationId, query);
  }

  @Post()
  @RequirePermissions('tasks:write')
  @ApiOperation({ summary: 'Crear tarea' })
  create(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateTaskDto) {
    return this.tasks.create(req.user.organizationId, req.user.userId, dto);
  }

  @Get(':id/assets')
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Assets vinculados a la tarea' })
  listAssets(@Req() req: Request & { user: RequestUser }, @Param('id') id: string) {
    return this.tasks.listTaskAssets(req.user.organizationId, id);
  }

  @Post(':id/assets')
  @RequirePermissions('tasks:write')
  @ApiOperation({ summary: 'Asociar uno o varios assets a la tarea' })
  linkAssets(
    @Req() req: Request & { user: RequestUser },
    @Param('id') id: string,
    @Body() dto: LinkTaskAssetsDto,
  ) {
    return this.tasks.linkTaskAssets(req.user.organizationId, req.user.userId, id, dto.assetIds);
  }

  @Delete(':id/assets/:assetId')
  @RequirePermissions('tasks:write')
  @ApiOperation({ summary: 'Quitar asset de la tarea' })
  unlinkAsset(
    @Req() req: Request & { user: RequestUser },
    @Param('id') id: string,
    @Param('assetId') assetId: string,
  ) {
    return this.tasks.unlinkTaskAsset(req.user.organizationId, req.user.userId, id, assetId);
  }

  @Get(':id/timeline')
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Historial de actividad de la tarea (cronológico)' })
  taskTimeline(@Req() req: Request & { user: RequestUser }, @Param('id') id: string) {
    return this.activity.findTaskTimeline(req.user.organizationId, id);
  }

  @Get(':id')
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Detalle de tarea' })
  findOne(@Req() req: Request & { user: RequestUser }, @Param('id') id: string) {
    return this.tasks.findOne(req.user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('tasks:write')
  @ApiOperation({ summary: 'Actualizar tarea' })
  update(
    @Req() req: Request & { user: RequestUser },
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(req.user.organizationId, req.user.userId, id, dto);
  }

  @Post(':id/move')
  @RequirePermissions('tasks:write')
  @ApiOperation({ summary: 'Mover tarea (drag & drop Kanban)' })
  move(
    @Req() req: Request & { user: RequestUser },
    @Param('id') id: string,
    @Body() dto: MoveTaskDto,
  ) {
    return this.tasks.move(req.user.organizationId, req.user.userId, id, dto);
  }
}
