import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { NextFunction, Request, Response } from 'express';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { AppModule } from './app.module';
import { StorageService } from './core/storage/storage.service';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';

async function bootstrap() {
  await mkdir(join(process.cwd(), 'uploads', 'attachments'), { recursive: true });
  await mkdir(join(process.cwd(), 'uploads', 'branding'), { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(['error', 'warn', 'log']);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useWebSocketAdapter(new IoAdapter(app));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOrigin = process.env.CORS_ORIGIN ?? '*';
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  });

  // Contenido subido por usuarios: un SVG abierto directamente no debe ejecutar scripts.
  app.use('/uploads', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    next();
  });
  const storage = app.get(StorageService);
  if (storage.isRemote) {
    app.use('/uploads', storage.serve());
  } else {
    app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  }

  const config = new DocumentBuilder()
    .setTitle('TaskForge API')
    .setDescription('SaaS de órdenes de trabajo, Kanban y operaciones')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`API en http://localhost:${port} (docs: /docs)`);
}

bootstrap();
