import { Injectable, NotFoundException } from '@nestjs/common';
import { EvidenceKind } from '@prisma/client';
import type { Express } from 'express';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { TaskTimelineAction } from '../../core/activity/task-timeline.constants';
import { CreateAttachmentDto } from './dto/create-attachment.dto';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async listByTask(organizationId: string, taskId: string) {
    await this.ensureTask(organizationId, taskId);
    return this.prisma.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  async create(organizationId: string, userId: string, taskId: string, dto: CreateAttachmentDto) {
    await this.ensureTask(organizationId, taskId);
    const capturedAt = dto.capturedAt ? new Date(dto.capturedAt) : undefined;
    const row = await this.prisma.attachment.create({
      data: {
        taskId,
        userId,
        url: dto.url,
        filename: dto.filename,
        mimeType: dto.mimeType,
        size: dto.size,
        evidenceKind: dto.evidenceKind ?? undefined,
        capturedAt: capturedAt ?? undefined,
        latitude: dto.latitude ?? undefined,
        longitude: dto.longitude ?? undefined,
      },
    });
    await this.logAttachmentAdded(userId, taskId, row, organizationId);
    return row;
  }

  async createFromUpload(
    organizationId: string,
    userId: string,
    taskId: string,
    file: Express.Multer.File,
    opts: {
      evidenceKind: EvidenceKind;
      capturedAt?: Date;
      latitude?: number;
      longitude?: number;
    },
  ) {
    await this.ensureTask(organizationId, taskId);
    const publicUrl = `/uploads/attachments/${file.filename}`;
    const row = await this.prisma.attachment.create({
      data: {
        taskId,
        userId,
        url: publicUrl,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        evidenceKind: opts.evidenceKind,
        capturedAt: opts.capturedAt ?? new Date(),
        latitude: opts.latitude ?? undefined,
        longitude: opts.longitude ?? undefined,
      },
    });
    await this.logAttachmentAdded(userId, taskId, row, organizationId);
    return row;
  }

  async createFromFileUpload(
    organizationId: string,
    userId: string,
    taskId: string,
    file: Express.Multer.File,
  ) {
    await this.ensureTask(organizationId, taskId);
    const publicUrl = `/uploads/attachments/${file.filename}`;
    const row = await this.prisma.attachment.create({
      data: {
        taskId,
        userId,
        url: publicUrl,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
    });
    await this.logAttachmentAdded(userId, taskId, row, organizationId);
    return row;
  }

  private async logAttachmentAdded(
    userId: string,
    taskId: string,
    row: { id: string; filename: string; mimeType: string; size: number; evidenceKind: EvidenceKind | null },
    organizationId: string,
  ) {
    await this.activity.log(
      userId,
      taskId,
      TaskTimelineAction.ATTACHMENT_ADDED,
      {
        attachmentId: row.id,
        filename: row.filename,
        mimeType: row.mimeType ?? null,
        size: row.size ?? null,
        evidenceKind: row.evidenceKind ?? null,
      },
      organizationId,
    );
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
