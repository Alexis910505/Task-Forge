import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Express, RequestHandler } from 'express';
import { readFile, unlink } from 'fs/promises';
import type { Readable } from 'stream';

export type UploadFolder = 'attachments' | 'branding';

const UPLOAD_PATH = /^\/(attachments|branding)\/([A-Za-z0-9][A-Za-z0-9._-]*)$/;

/**
 * Archivos subidos. `local`: disco (`uploads/`). `s3`: bucket privado compatible con S3;
 * la API los sirve en `/uploads/...`, así las URLs guardadas en BD no cambian.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client?: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET') ?? '';
    if (config.get<string>('STORAGE_DRIVER') === 's3') {
      this.client = new S3Client({
        endpoint: config.getOrThrow<string>('S3_ENDPOINT'),
        region: config.getOrThrow<string>('S3_REGION'),
        forcePathStyle: true,
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
        credentials: {
          accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
          secretAccessKey: config.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
        },
      });
    }
  }

  get isRemote(): boolean {
    return this.client !== undefined;
  }

  /** Publica un archivo que multer ya dejó en disco y devuelve su URL pública. */
  async persist(folder: UploadFolder, file: Express.Multer.File): Promise<string> {
    if (this.client) {
      try {
        await this.client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: `${folder}/${file.filename}`,
            Body: await readFile(file.path),
            ContentType: file.mimetype,
          }),
        );
      } finally {
        await unlink(file.path).catch(() => undefined);
      }
    }
    return `/uploads/${folder}/${file.filename}`;
  }

  /** Middleware montado en `/uploads` cuando el almacenamiento es remoto. */
  serve(): RequestHandler {
    return async (req, res, next) => {
      const match = UPLOAD_PATH.exec(req.path);
      if (!this.client || !match || (req.method !== 'GET' && req.method !== 'HEAD')) {
        next();
        return;
      }
      const [, folder, name] = match;
      try {
        const object = await this.client.send(
          new GetObjectCommand({ Bucket: this.bucket, Key: `${folder}/${name}` }),
        );
        res.setHeader('Content-Type', object.ContentType ?? 'application/octet-stream');
        if (object.ContentLength !== undefined) {
          res.setHeader('Content-Length', object.ContentLength);
        }
        // Los adjuntos llevan UUID (inmutables); el branding reutiliza el nombre.
        res.setHeader(
          'Cache-Control',
          folder === 'attachments' ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
        );
        const body = object.Body as Readable;
        if (req.method === 'HEAD') {
          body.destroy();
          res.end();
          return;
        }
        body.on('error', (e) => res.destroy(e));
        res.on('close', () => body.destroy());
        body.pipe(res);
      } catch (e) {
        const status = (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        if (status === 404) {
          next();
          return;
        }
        this.logger.error(`No se pudo leer ${folder}/${name}: ${(e as Error).message}`);
        next(e);
      }
    };
  }
}
