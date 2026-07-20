import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SocketEvents } from '../core/websocket/socket-events.constants';

type HandshakeAuth = { token?: string };

type AccessJwtPayload = {
  sub: string;
  email: string;
  role: string;
  organizationId: string;
  organizationSlug: string;
};

@WebSocketGateway({
  namespace: '/events',
  cors: { origin: true, credentials: true },
})
export class EventsGateway {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    const token = (client.handshake.auth as HandshakeAuth)?.token;
    if (!token) {
      this.logger.warn(`Socket ${client.id} sin token`);
      client.disconnect();
      return;
    }
    try {
      const payload = this.jwt.verify<AccessJwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      client.data.userId = payload.sub;
      client.data.role = payload.role;
      client.data.organizationId = payload.organizationId;
      void client.join(`org:${payload.organizationId}`);
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('board:join')
  joinBoard(@ConnectedSocket() client: Socket, @MessageBody() body: { boardId: string }) {
    if (!body?.boardId) {
      return { ok: false };
    }
    void client.join(`board:${body.boardId}`);
    return { ok: true, boardId: body.boardId };
  }

  @SubscribeMessage('board:leave')
  leaveBoard(@ConnectedSocket() client: Socket, @MessageBody() body: { boardId: string }) {
    if (!body?.boardId) {
      return { ok: false };
    }
    void client.leave(`board:${body.boardId}`);
    return { ok: true };
  }

  emitToBoard(boardId: string, event: string, payload: unknown) {
    this.server.to(`board:${boardId}`).emit(event, payload);
  }

  emitToOrganization(organizationId: string, event: string, payload: unknown) {
    this.server.to(`org:${organizationId}`).emit(event, payload);
  }

  emitTaskUpdated(boardId: string, payload: unknown) {
    const event = SocketEvents.TASK_UPDATED_LEGACY;
    const base =
      typeof payload === 'object' && payload !== null && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : { data: payload };
    this.server.to(`board:${boardId}`).emit(event, { ...base, boardId });
  }

  emitNotification(userId: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(SocketEvents.NOTIFICATION, payload);
  }

  @SubscribeMessage('user:join')
  joinUser(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (!userId) {
      return { ok: false };
    }
    void client.join(`user:${userId}`);
    return { ok: true };
  }
}
