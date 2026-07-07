import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma, TaskStatus } from '@prisma/client';
import { TaskTimelineAction, timelineSnippet } from '../../core/activity/task-timeline.constants';
import { SocketEvents } from '../../core/websocket/socket-events.constants';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { AssetsService } from '../assets/assets.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../../websocket/events.gateway';
import { normalizeDueDate } from '../../core/utils/due-date.util';
import { CreateTaskDto, ListTasksQueryDto, MoveTaskDto, UpdateTaskDto } from './dto/task.dto';

const taskAssetInclude = {
  taskAssets: {
    include: {
      asset: {
        select: {
          id: true,
          name: true,
          code: true,
          category: true,
          status: true,
          location: true,
          maintenanceDate: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly notifications: NotificationsService,
    private readonly events: EventsGateway,
    private readonly assets: AssetsService,
  ) {}

  list(organizationId: string, query: ListTasksQueryDto) {
    const where: Prisma.TaskWhereInput = {
      ...(query.boardId ? { boardId: query.boardId } : {}),
      board: { organizationId },
      ...(query.status ? { status: query.status } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.q
        ? {
            title: { contains: query.q, mode: Prisma.QueryMode.insensitive },
          }
        : {}),
    };
    return this.prisma.task.findMany({
      where,
      orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        board: { select: { id: true, name: true } },
        ...taskAssetInclude,
      },
    });
  }

  async create(organizationId: string, actorId: string, dto: CreateTaskDto) {
    const board = await this.prisma.board.findFirst({
      where: { id: dto.boardId, organizationId },
    });
    if (!board) {
      throw new NotFoundException('Tablero no encontrado');
    }
    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        boardId: dto.boardId,
        priority: dto.priority,
        assigneeId: dto.assigneeId,
        location: dto.location,
        dueDate: dto.dueDate ? normalizeDueDate(dto.dueDate) : undefined,
        createdById: actorId,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        board: true,
      },
    });
    await this.activity.log(
      actorId,
      task.id,
      TaskTimelineAction.TASK_CREATED,
      {
        title: task.title,
        boardId: task.boardId,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId ?? null,
      },
      organizationId,
    );
    if (task.assigneeId) {
      await this.activity.log(
        actorId,
        task.id,
        TaskTimelineAction.TASK_ASSIGNED,
        { assigneeId: task.assigneeId, context: 'on_create' },
        organizationId,
      );
    }
    if (dto.assetIds?.length) {
      await this.assets.ensureAllExist(organizationId, dto.assetIds);
      const unique = [...new Set(dto.assetIds)];
      let linked = 0;
      for (const assetId of unique) {
        const existing = await this.prisma.taskAsset.findUnique({
          where: { taskId_assetId: { taskId: task.id, assetId } },
        });
        if (!existing) {
          await this.prisma.taskAsset.create({ data: { taskId: task.id, assetId } });
          await this.assets.logTaskLink(assetId, actorId, task.id);
          linked += 1;
        }
      }
      if (linked > 0) {
        await this.activity.log(
          actorId,
          task.id,
          TaskTimelineAction.TASK_ASSETS_LINKED,
          { assetIds: unique },
          organizationId,
        );
      }
    }
    if (task.assigneeId) {
      await this.notifications.createForUser(
        task.assigneeId,
        NotificationType.TASK_ASSIGNED,
        'Nueva asignación',
        `Te asignaron: ${task.title}`,
        { taskId: task.id, taskTitle: task.title },
      );
      const assignPayload = {
        taskId: task.id,
        boardId: task.boardId,
        organizationId,
        assigneeId: task.assigneeId,
        previousAssigneeId: null as string | null,
      };
      this.events.emitToBoard(task.boardId, SocketEvents.TASK_ASSIGNED, assignPayload);
      this.events.emitToOrganization(organizationId, SocketEvents.TASK_ASSIGNED, assignPayload);
    }
    const createdPayload = { taskId: task.id, boardId: task.boardId, organizationId };
    this.events.emitToBoard(task.boardId, SocketEvents.TASK_CREATED, createdPayload);
    this.events.emitToOrganization(organizationId, SocketEvents.TASK_CREATED, createdPayload);
    this.events.emitToOrganization(organizationId, SocketEvents.DASHBOARD_REFRESH, { reason: 'task.created' });
    this.events.emitTaskUpdated(task.boardId, { type: 'task.created', taskId: task.id });
    return this.findOne(organizationId, task.id);
  }

  async findOne(organizationId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, board: { organizationId } },
      include: {
        assignee: { select: { id: true, email: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        board: true,
        comments: { orderBy: { createdAt: 'desc' }, include: { user: true } },
        attachments: { orderBy: { createdAt: 'desc' } },
        ...taskAssetInclude,
      },
    });
    if (!task) {
      throw new NotFoundException();
    }
    return task;
  }

  async listTaskAssets(organizationId: string, taskId: string) {
    await this.ensureTaskExists(organizationId, taskId);
    return this.prisma.taskAsset.findMany({
      where: { taskId, task: { board: { organizationId } } },
      orderBy: { createdAt: 'asc' },
      include: { asset: true },
    });
  }

  async linkTaskAssets(organizationId: string, actorId: string, taskId: string, assetIds: string[]) {
    const task = await this.ensureTaskExists(organizationId, taskId);
    await this.assets.ensureAllExist(organizationId, assetIds);
    const unique = [...new Set(assetIds)];
    let linked = 0;
    for (const assetId of unique) {
      const existing = await this.prisma.taskAsset.findUnique({
        where: { taskId_assetId: { taskId, assetId } },
      });
      if (!existing) {
        await this.prisma.taskAsset.create({ data: { taskId, assetId } });
        await this.assets.logTaskLink(assetId, actorId, taskId);
        linked += 1;
      }
    }
    if (linked > 0) {
      await this.activity.log(
        actorId,
        taskId,
        TaskTimelineAction.TASK_ASSETS_LINKED,
        { assetIds: unique },
        organizationId,
      );
    }
    this.events.emitTaskUpdated(task.boardId, { type: 'task.assets_updated', taskId });
    return this.listTaskAssets(organizationId, taskId);
  }

  async unlinkTaskAsset(organizationId: string, actorId: string, taskId: string, assetId: string) {
    const task = await this.ensureTaskExists(organizationId, taskId);
    const res = await this.prisma.taskAsset.deleteMany({
      where: { taskId, assetId },
    });
    if (res.count > 0) {
      await this.assets.logTaskUnlink(assetId, actorId, taskId);
      await this.activity.log(
        actorId,
        taskId,
        TaskTimelineAction.TASK_ASSET_UNLINKED,
        { assetId },
        organizationId,
      );
    }
    this.events.emitTaskUpdated(task.boardId, { type: 'task.assets_updated', taskId });
    return this.listTaskAssets(organizationId, taskId);
  }

  async update(organizationId: string, actorId: string, id: string, dto: UpdateTaskDto) {
    const existing = await this.prisma.task.findFirst({
      where: { id, board: { organizationId } },
    });
    if (!existing) {
      throw new NotFoundException();
    }
    const data: Prisma.TaskUncheckedUpdateInput = {};
    if (dto.title !== undefined) {
      data.title = dto.title;
    }
    if (dto.description !== undefined) {
      data.description = dto.description;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.priority !== undefined) {
      data.priority = dto.priority;
    }
    if (dto.assigneeId !== undefined) {
      data.assigneeId = dto.assigneeId || null;
    }
    if (dto.location !== undefined) {
      data.location = dto.location;
    }
    if (dto.dueDate !== undefined) {
      data.dueDate = dto.dueDate ? normalizeDueDate(dto.dueDate) : null;
    }
    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }

    if (Object.keys(data).length === 0) {
      const unchanged = await this.prisma.task.findFirst({
        where: { id, board: { organizationId } },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true } },
          board: true,
        },
      });
      if (!unchanged) {
        throw new NotFoundException();
      }
      return unchanged;
    }

    const timelineEntries: { action: string; metadata: Record<string, unknown> }[] = [];

    if (dto.title !== undefined && dto.title !== existing.title) {
      timelineEntries.push({
        action: TaskTimelineAction.TASK_TITLE_CHANGED,
        metadata: {
          from: timelineSnippet(existing.title),
          to: timelineSnippet(dto.title),
        },
      });
    }
    if (dto.description !== undefined && (dto.description ?? '') !== (existing.description ?? '')) {
      timelineEntries.push({
        action: TaskTimelineAction.TASK_DESCRIPTION_CHANGED,
        metadata: {
          fromPreview: timelineSnippet(existing.description, 120),
          toPreview: timelineSnippet(dto.description, 120),
        },
      });
    }
    if (dto.priority !== undefined && dto.priority !== existing.priority) {
      timelineEntries.push({
        action: TaskTimelineAction.TASK_PRIORITY_CHANGED,
        metadata: { from: existing.priority, to: dto.priority },
      });
    }
    if (dto.assigneeId !== undefined) {
      const nextAssignee = dto.assigneeId || null;
      const prevAssignee = existing.assigneeId ?? null;
      if (nextAssignee !== prevAssignee) {
        if (!nextAssignee && prevAssignee) {
          timelineEntries.push({
            action: TaskTimelineAction.TASK_UNASSIGNED,
            metadata: { previousAssigneeId: prevAssignee },
          });
        } else if (nextAssignee) {
          timelineEntries.push({
            action: TaskTimelineAction.TASK_ASSIGNED,
            metadata: { assigneeId: nextAssignee, fromAssigneeId: prevAssignee },
          });
        }
      }
    }
    if (dto.status !== undefined && dto.status !== existing.status) {
      if (dto.status === TaskStatus.COMPLETED && existing.status !== TaskStatus.COMPLETED) {
        timelineEntries.push({
          action: TaskTimelineAction.TASK_COMPLETED,
          metadata: { from: existing.status },
        });
      } else if (existing.status === TaskStatus.COMPLETED && dto.status !== TaskStatus.COMPLETED) {
        timelineEntries.push({
          action: TaskTimelineAction.TASK_REOPENED,
          metadata: { to: dto.status },
        });
      } else {
        timelineEntries.push({
          action: TaskTimelineAction.TASK_STATUS_CHANGED,
          metadata: { from: existing.status, to: dto.status },
        });
      }
    }
    if (dto.location !== undefined && (dto.location ?? '') !== (existing.location ?? '')) {
      timelineEntries.push({
        action: TaskTimelineAction.TASK_LOCATION_CHANGED,
        metadata: {
          from: timelineSnippet(existing.location),
          to: timelineSnippet(dto.location),
        },
      });
    }
    if (dto.dueDate !== undefined) {
      const prevMs = existing.dueDate ? existing.dueDate.getTime() : null;
      const nextMs = dto.dueDate ? new Date(dto.dueDate).getTime() : null;
      if (prevMs !== nextMs) {
        timelineEntries.push({
          action: TaskTimelineAction.TASK_DUE_DATE_CHANGED,
          metadata: {
            from: existing.dueDate?.toISOString() ?? null,
            to: dto.dueDate ? new Date(dto.dueDate).toISOString() : null,
          },
        });
      }
    }
    if (dto.sortOrder !== undefined && dto.sortOrder !== existing.sortOrder) {
      timelineEntries.push({
        action: TaskTimelineAction.TASK_SORT_ORDER_CHANGED,
        metadata: { from: existing.sortOrder, to: dto.sortOrder },
      });
    }

    const task = await this.prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        board: true,
      },
    });
    for (const entry of timelineEntries) {
      await this.activity.log(actorId, id, entry.action, entry.metadata, organizationId);
    }
    if (dto.assigneeId && dto.assigneeId !== existing.assigneeId) {
      await this.notifications.createForUser(
        dto.assigneeId,
        NotificationType.TASK_ASSIGNED,
        'Nueva asignación',
        `Te asignaron: ${task.title}`,
        { taskId: task.id, taskTitle: task.title },
      );
    }
    const boardId = task.boardId;
    const orgId = organizationId;
    const statusChanged = dto.status !== undefined && dto.status !== existing.status;
    const sortChanged = dto.sortOrder !== undefined && dto.sortOrder !== existing.sortOrder;
    const assigneeChanged =
      dto.assigneeId !== undefined && (dto.assigneeId || null) !== (existing.assigneeId ?? null);
    if (statusChanged) {
      const p = {
        taskId: id,
        boardId,
        organizationId: orgId,
        fromStatus: existing.status,
        toStatus: task.status,
      };
      this.events.emitToBoard(boardId, SocketEvents.TASK_STATUS_CHANGED, p);
      this.events.emitToOrganization(orgId, SocketEvents.TASK_STATUS_CHANGED, p);
    }
    if (statusChanged || sortChanged) {
      this.events.emitToBoard(boardId, SocketEvents.KANBAN_CARD_MOVED, {
        taskId: id,
        boardId,
        organizationId: orgId,
        status: task.status,
        sortOrder: task.sortOrder,
      });
    }
    if (assigneeChanged) {
      const p = {
        taskId: id,
        boardId,
        organizationId: orgId,
        assigneeId: task.assigneeId,
        previousAssigneeId: existing.assigneeId,
      };
      this.events.emitToBoard(boardId, SocketEvents.TASK_ASSIGNED, p);
      this.events.emitToOrganization(orgId, SocketEvents.TASK_ASSIGNED, p);
    }
    this.events.emitToOrganization(orgId, SocketEvents.DASHBOARD_REFRESH, { reason: 'task.updated' });
    this.events.emitTaskUpdated(boardId, { type: 'task.updated', taskId: task.id });
    return task;
  }

  async move(organizationId: string, actorId: string, id: string, dto: MoveTaskDto) {
    return this.update(organizationId, actorId, id, { status: dto.status, sortOrder: dto.sortOrder });
  }

  private async ensureTaskExists(organizationId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, board: { organizationId } },
    });
    if (!task) {
      throw new NotFoundException();
    }
    return task;
  }
}
