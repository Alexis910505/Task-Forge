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
