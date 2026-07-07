import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ACTIVITY_FEED_LIMIT, ActivityService } from './activity.service';
import { RequirePermissions } from '../../core/decorators/permissions.decorator';
import type { Request } from 'express';
import { RequestUser } from '../../core/strategies/jwt.strategy';

@ApiTags('activity')
@ApiBearerAuth()
@Controller('activity')
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get('recent')
  @RequirePermissions('activity:read')
  @ApiOperation({ summary: 'Actividad reciente de la organización' })
  recent(@Req() req: Request & { user: RequestUser }) {
    return this.activity.findRecentForOrganization(req.user.organizationId, ACTIVITY_FEED_LIMIT);
  }

  @Get('task/:taskId')
  @RequirePermissions('activity:read')
  @ApiOperation({ summary: 'Historial de una tarea' })
  forTask(@Req() req: Request & { user: RequestUser }, @Param('taskId') taskId: string) {
    return this.activity.findForTask(req.user.organizationId, taskId);
  }
}
