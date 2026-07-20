import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma, TaskStatus } from '@prisma/client';
import { TaskTimelineAction, timelineSnippet } from '../../core/activity/task-timeline.constants';
import { SocketEvents } from '../../core/websocket/socket-events.constants';
import { PrismaService } from '../../core/prisma/prisma.service';
import { resolveAccessScope, taskScopeWhere } from '../../core/security/access-scope';
import type { RequestUser } from '../../core/strategies/jwt.strategy';
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

const subtaskInclude = {
  assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
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

  async list(user: RequestUser, query: ListTasksQueryDto) {
    const organizationId = user.organizationId;
    const scope = await resolveAccessScope(this.prisma, user.userId, organizationId, user.role);
    const scopeWhere = taskScopeWhere(scope);
    const worklistUserId = query.worklistFor?.trim() || null;

    const listInclude = {
      assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      board: {
        select: {
          id: true,
          name: true,
          project: { select: { id: true, name: true } },
        },
      },
      parentTask: { select: { id: true, title: true } },
      _count: { select: { subtasks: true } },
      subtasks: { select: { status: true } },
      ...taskAssetInclude,
    } as const;

    // Cola móvil/usuario: todas las boards/proyectos de la org (solo tareas padre por defecto).
    if (worklistUserId) {
      const includeSubtasks = query.rootOnly === false;
      return this.prisma.task.findMany({
        where: {
          board: { organizationId },
          OR: [{ assigneeId: worklistUserId }, { assigneeId: null }],
          ...(query.status ? { status: query.status } : {}),
          ...(query.parentId ? { parentTaskId: query.parentId } : {}),
          ...(!includeSubtasks && !query.parentId ? { parentTaskId: null } : {}),
          ...(query.q
            ? {
                title: { contains: query.q, mode: Prisma.QueryMode.insensitive },
              }
            : {}),
          ...(scopeWhere ?? {}),
        },
        orderBy: [{ updatedAt: 'desc' }, { status: 'asc' }, { sortOrder: 'asc' }],
        include: listInclude,
      }).then((tasks) => tasks.map((t) => this.withSubtaskProgress(t)));
    }

    // Kanban/board: solo raíces. Mis tareas (assigneeId): incluir también subtareas.
    const rootOnly = query.parentId
      ? false
      : query.rootOnly !== undefined
        ? query.rootOnly
        : !query.assigneeId;
    const assigneeWhere: Prisma.TaskWhereInput | undefined = query.assigneeId
      ? query.includeUnassigned
        ? { OR: [{ assigneeId: query.assigneeId }, { assigneeId: null }] }
        : { assigneeId: query.assigneeId }
      : undefined;

    const where: Prisma.TaskWhereInput = {
      ...(query.boardId ? { boardId: query.boardId } : {}),
      board: { organizationId },
      ...(query.status ? { status: query.status } : {}),
      ...assigneeWhere,
      ...(query.parentId ? { parentTaskId: query.parentId } : {}),
      ...(rootOnly && !query.parentId ? { parentTaskId: null } : {}),
      ...(query.q
        ? {
            title: { contains: query.q, mode: Prisma.QueryMode.insensitive },
          }
        : {}),
      ...(scopeWhere ?? {}),
    };
    return this.prisma.task.findMany({
      where,
      orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
      include: listInclude,
    }).then((tasks) => tasks.map((t) => this.withSubtaskProgress(t)));
  }

  private withSubtaskProgress<T extends { subtasks?: { status: TaskStatus }[]; _count?: { subtasks: number } }>(
    task: T,
  ) {
    const { subtasks, ...rest } = task as T & { subtasks?: { status: TaskStatus }[] };
    const statuses = subtasks ?? [];
    return {
      ...rest,
      subtaskProgress: this.computeSubtaskProgress(statuses),
    };
  }

  async create(organizationId: string, actorId: string, dto: CreateTaskDto) {
    const placement = await this.resolveTaskPlacement(organizationId, dto);
    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        boardId: placement.boardId,
        parentTaskId: placement.parentTaskId,
        sortOrder: placement.sortOrder,
        status: placement.parentTaskId
          ? TaskStatus.TODO
          : (dto.status ?? TaskStatus.TODO),
        priority: dto.priority,
        assigneeId: dto.assigneeId,
        location: dto.location,
        dueDate: dto.dueDate ? normalizeDueDate(dto.dueDate) : undefined,
        createdById: actorId,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        board: true,
        parentTask: { select: { id: true, title: true } },
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
        parentTaskId: task.parentTaskId ?? null,
      },
      organizationId,
    );
    if (placement.parentTaskId) {
      await this.activity.log(
        actorId,
        placement.parentTaskId,
        TaskTimelineAction.TASK_SUBTASK_CREATED,
        { subtaskId: task.id, subtaskTitle: task.title },
        organizationId,
      );
      this.events.emitTaskUpdated(task.boardId, {
        type: 'task.subtasks_updated',
        taskId: placement.parentTaskId,
      });
    }
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

    const assignedToSomeone = Boolean(task.assigneeId);
    await this.notifications.notifyTaskAudience({
      organizationId,
      assigneeId: task.assigneeId,
      excludeUserId: actorId,
      type: NotificationType.TASK_ASSIGNED,
      title: assignedToSomeone ? 'Nueva asignación' : 'Nueva tarea para todos',
      body: assignedToSomeone
        ? `Te asignaron: ${task.title}`
        : `Nueva tarea disponible: ${task.title}`,
      metadata: {
        taskId: task.id,
        taskTitle: task.title,
        forEveryone: !assignedToSomeone,
      },
    });
    if (task.assigneeId) {
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
        parentTask: { select: { id: true, title: true, status: true } },
        subtasks: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: subtaskInclude,
        },
        comments: { orderBy: { createdAt: 'desc' }, include: { user: true } },
        attachments: { orderBy: { createdAt: 'desc' } },
        ...taskAssetInclude,
      },
    });
    if (!task) {
      throw new NotFoundException();
    }
    const { subtasks, ...rest } = task;
    return {
      ...rest,
      subtasks,
      subtaskProgress: this.computeSubtaskProgress(subtasks),
    };
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
      if (existing.parentTaskId) {
        if (dto.status !== TaskStatus.TODO && dto.status !== TaskStatus.COMPLETED) {
          throw new BadRequestException(
            'Las subtareas solo pueden estar en estado por hacer o hecho',
          );
        }
      }
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
      if (dto.status === TaskStatus.COMPLETED && !existing.parentTaskId) {
        await this.assertParentCanComplete(id);
      }
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

    const boardId = task.boardId;
    const orgId = organizationId;
    const statusChanged = dto.status !== undefined && dto.status !== existing.status;
    const sortChanged = dto.sortOrder !== undefined && dto.sortOrder !== existing.sortOrder;
    const assigneeChanged =
      dto.assigneeId !== undefined && (dto.assigneeId || null) !== (existing.assigneeId ?? null);

    if (assigneeChanged) {
      const nextAssignee = task.assigneeId ?? null;
      const assignedToSomeone = Boolean(nextAssignee);
      await this.notifications.notifyTaskAudience({
        organizationId,
        assigneeId: nextAssignee,
        excludeUserId: actorId,
        type: NotificationType.TASK_ASSIGNED,
        title: assignedToSomeone ? 'Nueva asignación' : 'Tarea disponible para todos',
        body: assignedToSomeone
          ? `Te asignaron: ${task.title}`
          : `La tarea quedó sin asignar: ${task.title}`,
        metadata: {
          taskId: task.id,
          taskTitle: task.title,
          forEveryone: !assignedToSomeone,
        },
      });
    }

    if (statusChanged) {
      await this.notifications.notifyTaskAudience({
        organizationId,
        assigneeId: task.assigneeId,
        excludeUserId: actorId,
        type: NotificationType.TASK_UPDATED,
        title: 'Actualización de tarea',
        body: `Estado de “${task.title}”: ${existing.status} → ${task.status}`,
        metadata: {
          taskId: task.id,
          taskTitle: task.title,
          fromStatus: existing.status,
          toStatus: task.status,
          forEveryone: !task.assigneeId,
        },
      });
    }

    if (statusChanged) {
      const p = {
        taskId: id,
        boardId,
        organizationId: orgId,
        fromStatus: existing.status,
        toStatus: task.status,
        parentTaskId: existing.parentTaskId ?? null,
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
    // También a la org: clientes en Mis tareas (sin board:join) reciben el cambio.
    this.events.emitToOrganization(orgId, SocketEvents.TASK_UPDATED_LEGACY, {
      type: 'task.updated',
      taskId: task.id,
      boardId,
      parentTaskId: existing.parentTaskId ?? null,
      status: task.status,
    });
    if (existing.parentTaskId && statusChanged) {
      this.events.emitTaskUpdated(boardId, {
        type: 'task.subtasks_updated',
        taskId: existing.parentTaskId,
      });
      this.events.emitToOrganization(orgId, SocketEvents.TASK_UPDATED_LEGACY, {
        type: 'task.subtasks_updated',
        taskId: existing.parentTaskId,
        boardId,
      });
    }
    return task;
  }

  async move(organizationId: string, actorId: string, id: string, dto: MoveTaskDto) {
    const existing = await this.prisma.task.findFirst({
      where: { id, board: { organizationId } },
      select: { parentTaskId: true },
    });
    if (!existing) {
      throw new NotFoundException();
    }
    if (existing.parentTaskId) {
      throw new BadRequestException('Las subtareas no se mueven en el tablero kanban');
    }
    return this.update(organizationId, actorId, id, { status: dto.status, sortOrder: dto.sortOrder });
  }

  private computeSubtaskProgress(subtasks: { status: TaskStatus }[]) {
    const total = subtasks.length;
    const completed = subtasks.filter((s) => s.status === TaskStatus.COMPLETED).length;
    return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }

  private async resolveTaskPlacement(organizationId: string, dto: CreateTaskDto) {
    if (dto.parentTaskId) {
      const parent = await this.prisma.task.findFirst({
        where: { id: dto.parentTaskId, board: { organizationId } },
        select: { id: true, boardId: true, parentTaskId: true },
      });
      if (!parent) {
        throw new NotFoundException('Tarea padre no encontrada');
      }
      if (parent.parentTaskId) {
        throw new BadRequestException('Solo se permiten subtareas de un nivel');
      }
      if (dto.boardId && dto.boardId !== parent.boardId) {
        throw new BadRequestException('La subtarea debe pertenecer al mismo tablero que su padre');
      }
      const agg = await this.prisma.task.aggregate({
        where: { parentTaskId: parent.id },
        _max: { sortOrder: true },
      });
      return {
        boardId: parent.boardId,
        parentTaskId: parent.id,
        sortOrder: (agg._max.sortOrder ?? -1) + 1,
      };
    }
    if (!dto.boardId) {
      throw new BadRequestException('boardId es obligatorio para tareas raíz');
    }
    const board = await this.prisma.board.findFirst({
      where: { id: dto.boardId, organizationId },
    });
    if (!board) {
      throw new NotFoundException('Tablero no encontrado');
    }
    return { boardId: dto.boardId, parentTaskId: null as string | null, sortOrder: 0 };
  }

  private async assertParentCanComplete(parentTaskId: string) {
    const open = await this.prisma.task.count({
      where: {
        parentTaskId,
        status: { not: TaskStatus.COMPLETED },
      },
    });
    if (open > 0) {
      throw new BadRequestException(
        'No puedes completar la tarea mientras haya subtareas pendientes',
      );
    }
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
