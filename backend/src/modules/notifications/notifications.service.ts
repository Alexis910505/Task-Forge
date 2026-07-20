import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EventsGateway } from '../../websocket/events.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  createForUser(
    userId: string,
    type: NotificationType,
    title: string,
    body?: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.notification
      .create({
        data: {
          userId,
          type,
          title,
          body,
          metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
        },
      })
      .then((row) => {
        this.events.emitNotification(userId, {
          id: row.id,
          type: row.type,
          title: row.title,
          body: row.body ?? null,
          metadata: row.metadata ?? null,
          read: row.read,
          createdAt: row.createdAt.toISOString(),
        });
        return row;
      });
  }

  /**
   * Destinatarios de una tarea:
   * - Con assignee → solo ese usuario
   * - Sin assignee (“para todos”) → usuarios activos de la organización
   * Siempre se excluye al actor (quien disparó el evento).
   */
  async resolveTaskRecipientIds(
    organizationId: string,
    assigneeId: string | null | undefined,
    excludeUserId?: string | null,
  ): Promise<string[]> {
    let ids: string[];
    if (assigneeId) {
      ids = [assigneeId];
    } else {
      const users = await this.prisma.user.findMany({
        where: { organizationId, isActive: true },
        select: { id: true },
      });
      ids = users.map((u) => u.id);
    }
    if (excludeUserId) {
      ids = ids.filter((id) => id !== excludeUserId);
    }
    return [...new Set(ids)];
  }

  async notifyUsers(
    userIds: string[],
    type: NotificationType,
    title: string,
    body?: string,
    metadata?: Record<string, unknown>,
  ) {
    if (userIds.length === 0) {
      return [];
    }
    return Promise.all(
      userIds.map((userId) => this.createForUser(userId, type, title, body, metadata)),
    );
  }

  /** Notifica al assignee o, si la tarea es para todos, a toda la org (excepto el actor). */
  async notifyTaskAudience(params: {
    organizationId: string;
    assigneeId: string | null | undefined;
    excludeUserId?: string | null;
    type: NotificationType;
    title: string;
    body?: string;
    metadata?: Record<string, unknown>;
  }) {
    const recipients = await this.resolveTaskRecipientIds(
      params.organizationId,
      params.assigneeId,
      params.excludeUserId,
    );
    return this.notifyUsers(
      recipients,
      params.type,
      params.title,
      params.body,
      params.metadata,
    );
  }

  listForUser(userId: string, unreadOnly?: boolean) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  countUnread(userId: string) {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }
}
