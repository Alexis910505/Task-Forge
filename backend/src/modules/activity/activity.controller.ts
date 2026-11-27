import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ACTIVITY_FEED_LIMIT, ActivityService } from './activity.service';
import { RequirePermissions } from '../../core/decorators/permissions.decorator';
import type { Request } from 'express';
import { RequestUser } from '../../core/strategies/jwt.strategy';
import { TaskAccessService } from '../../core/security/task-access.service';


@ApiTags('activity')
@ApiBearerAuth()
@Controller('activity')
export class ActivityController {
  constructor(
    private readonly activity: ActivityService,
    private readonly access: TaskAccessService,
  ) {}

  @Get('recent')
  @RequirePermissions('activity:read')
  @ApiOperation({ summary: 'Actividad reciente de la organización' })
  async recent(@Req() req: Request & { user: RequestUser }) {
    const taskWhere = await this.access.activityWhereFor(req.user);
    return this.activity.findRecentForOrganization(
      req.user.organizationId,
      ACTIVITY_FEED_LIMIT,
      undefined,
      taskWhere ? { userId: req.user.userId, taskWhere } : undefined,
    );
  }

  @Get('task/:taskId')
  @RequirePermissions('activity:read')
  @ApiOperation({ summary: 'Historial de una tarea' })
  async forTask(@Req() req: Request & { user: RequestUser }, @Param('taskId') taskId: string) {
    await this.access.assert(req.user, taskId);
    return this.activity.findForTask(req.user.organizationId, taskId);
  }
}
