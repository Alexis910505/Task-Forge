import { ForbiddenException, Global, Injectable, Module } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../strategies/jwt.strategy';
import { resolveAccessScope, taskScopeWhere } from './access-scope';
import { userCan } from './role-permissions';

/**
 * Qué tareas puede ver cada usuario (un solo sitio para lista, kanban, panel,
 * actividad, detalle, comentarios y adjuntos).
 */
@Injectable()
export class TaskAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Filtro extra de tareas para este usuario; undefined = sin límite. */
  async whereFor(user: RequestUser): Promise<Prisma.TaskWhereInput | undefined> {
    const scope = await resolveAccessScope(this.prisma, user.userId, user.organizationId, user.role);
    return taskScopeWhere(scope);
  }

  /**
   * Página «Trabajo» (panel) y feed de actividad: lo personal del usuario.
   * Sin permiso dashboard:read_all: solo las tareas asignadas a él.
   */
  dashboardWhereFor(user: RequestUser): Prisma.TaskWhereInput | undefined {
    return userCan(user, 'dashboard:read_all') ? undefined : { assigneeId: user.userId };
  }

  /** Feed de actividad. Sin permiso activity:read_all: solo la de sus tareas. */
  activityWhereFor(user: RequestUser): Prisma.TaskWhereInput | undefined {
    return userCan(user, 'activity:read_all') ? undefined : { assigneeId: user.userId };
  }

  /** Lanza 403 si el usuario no puede ver esa tarea (404 si no existe en su organización). */
  async assert(user: RequestUser, taskId: string): Promise<void> {
    const extra = await this.whereFor(user);
    if (!extra) return;
    const found = await this.prisma.task.findFirst({
      where: { id: taskId, board: { organizationId: user.organizationId }, ...extra },
      select: { id: true },
    });
    if (!found) {
      const exists = await this.prisma.task.count({
        where: { id: taskId, board: { organizationId: user.organizationId } },
      });
      if (exists) throw new ForbiddenException('No tienes acceso a esta tarea');
    }
  }

  /** Sin permiso de asignar, solo puede dejar la tarea «para todos» o asignársela a sí mismo. */
  assertAssignee(user: RequestUser, assigneeId: string | null | undefined): void {
    if (assigneeId && assigneeId !== user.userId && !this.canAssign(user)) {
      throw new ForbiddenException('No puedes asignar tareas a otras personas');
    }
  }

  /**
   * Edición de una tarea por quien no puede asignar (Operario):
   * - siempre puede trabajarla (estado, orden) si la ve;
   * - solo cambia título, descripción, prioridad, ubicación, fecha o repetición si la creó él;
   * - puede tomar una tarea «para todos» o soltar la suya, no quitársela a otro.
   */
  async assertCanEdit(
    user: RequestUser,
    taskId: string,
    dto: {
      title?: unknown;
      description?: unknown;
      priority?: unknown;
      location?: unknown;
      dueDate?: unknown;
      recurrence?: unknown;
      assigneeId?: string | null;
    },
  ): Promise<void> {
    await this.assert(user, taskId);
    const editAll = userCan(user, 'tasks:edit_all');
    const assign = this.canAssign(user);
    if (editAll && assign) return;
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, board: { organizationId: user.organizationId } },
      select: { createdById: true, assigneeId: true },
    });
    if (!task) return;
    const detail = ['title', 'description', 'priority', 'location', 'dueDate', 'recurrence'] as const;
    if (!editAll && task.createdById !== user.userId && detail.some((k) => dto[k] !== undefined)) {
      throw new ForbiddenException('Solo puedes cambiar los datos de las tareas que creaste');
    }
    if (!assign && dto.assigneeId !== undefined) {
      const next = dto.assigneeId || null;
      if (next && next !== user.userId) {
        throw new ForbiddenException('No puedes asignar tareas a otras personas');
      }
      if (task.assigneeId && task.assigneeId !== user.userId && next !== task.assigneeId) {
        throw new ForbiddenException('Esta tarea está asignada a otra persona');
      }
    }
  }

  /** ¿Puede asignar tareas a otras personas? (permiso tasks:assign) */
  canAssign(user: RequestUser): boolean {
    return userCan(user, 'tasks:assign');
  }
}

@Global()
@Module({
  providers: [TaskAccessService],
  exports: [TaskAccessService],
})
export class TaskAccessModule {}
