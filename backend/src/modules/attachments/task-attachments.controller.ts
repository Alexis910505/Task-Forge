import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import type { Express, Request } from 'express';
import { AttachmentsService } from './attachments.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { UploadEvidenceDto } from './dto/upload-evidence.dto';
import { RequirePermissions } from '../../core/decorators/permissions.decorator';
import { RequestUser } from '../../core/strategies/jwt.strategy';

const evidenceUploadDir = join(process.cwd(), 'uploads', 'attachments');
const MAX_EVIDENCE_BYTES = 20 * 1024 * 1024;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const EVIDENCE_MIME = /^(image\/jpeg|image\/png|image\/webp)$/;
const TASK_FILE_MIME =
  /^(image\/(jpeg|png|webp)|application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/;

const evidenceMulterStorage = diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => cb(null, evidenceUploadDir),
  filename: (_req: Request, file: Express.Multer.File, cb) =>
    cb(null, `${randomUUID()}${extname(file.originalname) || '.jpg'}`),
});

@ApiTags('attachments')
@ApiBearerAuth()
@Controller('tasks')
export class TaskAttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Get(':taskId/attachments')
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Evidencias / adjuntos de una tarea' })
  list(@Req() req: Request & { user: RequestUser }, @Param('taskId') taskId: string) {
    return this.attachments.listByTask(req.user.organizationId, taskId);
  }

  @Post(':taskId/attachments/upload')
  @RequirePermissions('attachments:write')
  @ApiOperation({ summary: 'Subir evidencia fotográfica (multipart)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'evidenceKind'],
      properties: {
        file: { type: 'string', format: 'binary' },
        evidenceKind: { type: 'string', enum: ['BEFORE', 'AFTER'] },
        capturedAt: { type: 'string', format: 'date-time' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: evidenceMulterStorage,
      limits: { fileSize: MAX_EVIDENCE_BYTES },
    }),
  )
  upload(
    @Req() req: Request & { user: RequestUser },
    @Param('taskId') taskId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_EVIDENCE_BYTES }),
          new FileTypeValidator({
            fileType: EVIDENCE_MIME,
            // diskStorage no rellena buffer; validar por mimetype del multipart.
            fallbackToMimetype: true,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: UploadEvidenceDto,
  ) {
    return this.attachments.createFromUpload(req.user.organizationId, req.user.userId, taskId, file, {
      evidenceKind: body.evidenceKind,
      capturedAt: body.capturedAt ? new Date(body.capturedAt) : undefined,
      latitude: body.latitude,
      longitude: body.longitude,
    });
  }

  @Post(':taskId/attachments/file')
  @RequirePermissions('attachments:write')
  @ApiOperation({ summary: 'Subir adjunto general (documento o imagen, máx. 10 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: evidenceMulterStorage,
      limits: { fileSize: MAX_FILE_BYTES },
    }),
  )
  uploadFile(
    @Req() req: Request & { user: RequestUser },
    @Param('taskId') taskId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_BYTES }),
          new FileTypeValidator({
            fileType: TASK_FILE_MIME,
            fallbackToMimetype: true,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.attachments.createFromFileUpload(req.user.organizationId, req.user.userId, taskId, file);
  }

  @Post(':taskId/attachments')
  @RequirePermissions('attachments:write')
  @ApiOperation({ summary: 'Registrar adjunto (tras subida a blob/S3)' })
  create(
    @Req() req: Request & { user: RequestUser },
    @Param('taskId') taskId: string,
    @Body() dto: CreateAttachmentDto,
  ) {
    return this.attachments.create(req.user.organizationId, req.user.userId, taskId, dto);
  }
}
