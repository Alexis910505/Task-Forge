import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

export const DASHBOARD_RECENT_ACTIVITY_LIMIT = 10;
export const ACTIVITY_FEED_LIMIT = 50;

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  log(
    userId: string | undefined,
    taskId: string | undefined,
    action: string,
    metadata?: Record<string, unknown>,
    organizationId?: string | null,
  ) {
    return this.prisma.activityLog.create({
      data: {
        userId: userId ?? null,
        taskId: taskId ?? null,
        action,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
        organizationId: organizationId ?? undefined,
      },
    });
  }

  findForTask(organizationId: string, taskId: string) {
    return this.prisma.activityLog.findMany({
      where: {
        taskId,
        task: { board: { organizationId } },
      },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  /** Timeline cronológico (más antiguo primero), para UI estilo GitHub. */
  findTaskTimeline(organizationId: string, taskId: string) {
    return this.prisma.activityLog.findMany({
      where: {
        taskId,
        task: { board: { organizationId } },
      },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  findRecent(organizationId: string, organizationLimit = 50) {
    return this.findRecentForOrganization(organizationId, organizationLimit);
  }

  /** Incluye registros con organizationId o tareas de la org (datos históricos sin org en el log). */
  findRecentForOrganization(
    organizationId: string,
    limit = 50,
    since?: Date,
  ) {
    return this.prisma.activityLog.findMany({
      where: {
        AND: [
          {
            OR: [
              { organizationId },
              { task: { board: { organizationId } } },
            ],
          },
          ...(since ? [{ createdAt: { gte: since } }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        task: { select: { id: true, title: true, boardId: true } },
      },
    });
  }
}
