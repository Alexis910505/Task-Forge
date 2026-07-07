import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { RequirePermissions } from '../../core/decorators/permissions.decorator';
import type { Request } from 'express';
import { RequestUser } from '../../core/strategies/jwt.strategy';

@ApiTags('comments')
@ApiBearerAuth()
@Controller('tasks')
export class TaskCommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get(':taskId/comments')
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Comentarios de una tarea' })
  list(@Req() req: Request & { user: RequestUser }, @Param('taskId') taskId: string) {
    return this.comments.listByTask(req.user.organizationId, taskId);
  }

  @Post(':taskId/comments')
  @RequirePermissions('comments:write')
  @ApiOperation({ summary: 'Añadir comentario' })
  create(
    @Req() req: Request & { user: RequestUser },
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.comments.create(req.user.organizationId, req.user.userId, taskId, dto);
  }
}
