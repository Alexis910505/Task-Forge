import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, ListTasksQueryDto, MoveTaskDto, UpdateTaskDto } from './dto/task.dto';
import { LinkTaskAssetsDto } from './dto/task-assets.dto';
import { RequirePermissions } from '../../core/decorators/permissions.decorator';
import type { Request } from 'express';
import { RequestUser } from '../../core/strategies/jwt.strategy';
import { ActivityService } from '../activity/activity.service';
import { TaskAccessService } from '../../core/security/task-access.service';


@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasks: TasksService,
    private readonly activity: ActivityService,
    private readonly access: TaskAccessService,
  ) {}

  @Get()
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Listar tareas con filtros y búsqueda' })
  list(@Req() req: Request & { user: RequestUser }, @Query() query: ListTasksQueryDto) {
    return this.tasks.list(req.user, query);
  }

  @Post()
  @RequirePermissions('tasks:write')
  @ApiOperation({ summary: 'Crear tarea' })
  async create(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateTaskDto) {
    this.access.assertAssignee(req.user, dto.assigneeId);
    if (dto.parentTaskId) await this.access.assert(req.user, dto.parentTaskId);
    return this.tasks.create(req.user.organizationId, req.user.userId, dto);
  }

  @Get(':id/assets')
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Assets vinculados a la tarea' })
  async listAssets(@Req() req: Request & { user: RequestUser }, @Param('id') id: string) {
    await this.access.assert(req.user, id);
    return this.tasks.listTaskAssets(req.user.organizationId, id);
  }

  @Post(':id/assets')
  @RequirePermissions('tasks:write')
  @ApiOperation({ summary: 'Asociar uno o varios assets a la tarea' })
  async linkAssets(
    @Req() req: Request & { user: RequestUser },
    @Param('id') id: string,
    @Body() dto: LinkTaskAssetsDto,
  ) {
    await this.access.assert(req.user, id);
    return this.tasks.linkTaskAssets(req.user.organizationId, req.user.userId, id, dto.assetIds);
  }

  @Delete(':id/assets/:assetId')
  @RequirePermissions('tasks:write')
  @ApiOperation({ summary: 'Quitar asset de la tarea' })
  async unlinkAsset(
    @Req() req: Request & { user: RequestUser },
    @Param('id') id: string,
    @Param('assetId') assetId: string,
  ) {
    await this.access.assert(req.user, id);
    return this.tasks.unlinkTaskAsset(req.user.organizationId, req.user.userId, id, assetId);
  }

  @Get(':id/timeline')
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Historial de actividad de la tarea (cronológico)' })
  async taskTimeline(@Req() req: Request & { user: RequestUser }, @Param('id') id: string) {
    await this.access.assert(req.user, id);
    return this.activity.findTaskTimeline(req.user.organizationId, id);
  }

  @Get(':id')
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Detalle de tarea' })
  async findOne(@Req() req: Request & { user: RequestUser }, @Param('id') id: string) {
    await this.access.assert(req.user, id);
    return this.tasks.findOne(req.user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('tasks:write')
  @ApiOperation({ summary: 'Actualizar tarea' })
  async update(
    @Req() req: Request & { user: RequestUser },
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    await this.access.assertCanEdit(req.user, id, dto);
    return this.tasks.update(req.user.organizationId, req.user.userId, id, dto);
  }

  @Post(':id/move')
  @RequirePermissions('tasks:write')
  @ApiOperation({ summary: 'Mover tarea (drag & drop Kanban)' })
  async move(
    @Req() req: Request & { user: RequestUser },
    @Param('id') id: string,
    @Body() dto: MoveTaskDto,
  ) {
    await this.access.assert(req.user, id);
    return this.tasks.move(req.user.organizationId, req.user.userId, id, dto);
  }
}
