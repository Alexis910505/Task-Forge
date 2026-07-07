import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { SocketEvents } from '../../core/websocket/socket-events.constants';
import { EventsGateway } from '../../websocket/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { TaskTimelineAction, timelineSnippet } from '../../core/activity/task-timeline.constants';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly notifications: NotificationsService,
    private readonly events: EventsGateway,
  ) {}

  async listByTask(organizationId: string, taskId: string) {
    await this.ensureTask(organizationId, taskId);
    return this.prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  async create(organizationId: string, userId: string, taskId: string, dto: CreateCommentDto) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, board: { organizationId } },
      include: { assignee: true, createdBy: true },
    });
    if (!task) {
      throw new NotFoundException();
    }
    const comment = await this.prisma.taskComment.create({
      data: { taskId, userId, content: dto.content },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
    await this.activity.log(
      userId,
      taskId,
      TaskTimelineAction.COMMENT_ADDED,
      {
        commentId: comment.id,
        snippet: timelineSnippet(dto.content, 200),
      },
      organizationId,
    );
    const notifyIds = new Set<string>();
    if (task.assigneeId && task.assigneeId !== userId) {
      notifyIds.add(task.assigneeId);
    }
    if (task.createdById !== userId) {
      notifyIds.add(task.createdById);
    }
    for (const uid of notifyIds) {
      await this.notifications.createForUser(
        uid,
        NotificationType.COMMENT,
        'Nuevo comentario',
        dto.content.slice(0, 120),
        { taskId, commentId: comment.id, taskTitle: task.title, threadTitle: task.title },
      );
    }
    const commentPayload = {
      taskId,
      boardId: task.boardId,
      organizationId,
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        userId: comment.userId,
        user: comment.user,
      },
    };
    this.events.emitToBoard(task.boardId, SocketEvents.COMMENT_CREATED, commentPayload);
    this.events.emitToOrganization(organizationId, SocketEvents.COMMENT_CREATED, commentPayload);
    this.events.emitToOrganization(organizationId, SocketEvents.DASHBOARD_REFRESH, { reason: 'comment.created' });
    return comment;
  }

  private async ensureTask(organizationId: string, taskId: string) {
    const t = await this.prisma.task.findFirst({
      where: { id: taskId, board: { organizationId } },
    });
    if (!t) {
      throw new NotFoundException();
    }
  }
}
