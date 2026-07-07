import { Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { RequirePermissions } from '../../core/decorators/permissions.decorator';
import type { Request } from 'express';
import { RequestUser } from '../../core/strategies/jwt.strategy';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @RequirePermissions('notifications:read')
  @ApiOperation({ summary: 'Listar notificaciones del usuario' })
  list(
    @Req() req: Request & { user: RequestUser },
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notifications.listForUser(req.user.userId, unreadOnly === 'true');
  }

  @Get('unread-count')
  @RequirePermissions('notifications:read')
  @ApiOperation({ summary: 'Contador de notificaciones sin leer' })
  async unreadCount(@Req() req: Request & { user: RequestUser }) {
    const count = await this.notifications.countUnread(req.user.userId);
    return { count };
  }

  @Patch('read-all')
  @RequirePermissions('notifications:read')
  @ApiOperation({ summary: 'Marcar todas como leídas' })
  markAllRead(@Req() req: Request & { user: RequestUser }) {
    return this.notifications.markAllRead(req.user.userId);
  }

  @Patch(':id/read')
  @RequirePermissions('notifications:read')
  @ApiOperation({ summary: 'Marcar como leída' })
  markRead(@Req() req: Request & { user: RequestUser }, @Param('id') id: string) {
    return this.notifications.markRead(req.user.userId, id);
  }
}
