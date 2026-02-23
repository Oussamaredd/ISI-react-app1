import 'reflect-metadata';
import { Logger as NestLogger, ValidationPipe, type LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Request, Response } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { requestIdMiddleware } from './common/middleware/request-id.middleware.js';

const resolveNestLoggerOption = (
  nodeEnv: string | undefined,
  logLevel: string | undefined,
): LogLevel[] | false => {
  const normalizedEnv = nodeEnv?.trim().toLowerCase() ?? 'development';
  const normalizedLevel = logLevel?.trim().toLowerCase();

  if (normalizedEnv === 'production') {
    return ['error', 'warn', 'log'];
  }

  if (normalizedLevel === 'debug' || normalizedLevel === 'trace') {
    return ['error', 'warn', 'log', 'debug', 'verbose'];
  }

  return false;
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger: resolveNestLoggerOption(process.env.NODE_ENV, process.env.LOG_LEVEL),
  });

  app.useLogger(app.get(Logger));
  app.flushLogs();

  app.use(requestIdMiddleware);
  app.use(
    helmet({
      // CSP is disabled because this process serves API responses, not browser-rendered HTML.
      contentSecurityPolicy: false,
    }),
  );

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3001);
  const host = process.env.API_HOST ?? '0.0.0.0';
  const origins = (process.env.CORS_ORIGINS ?? process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/health', (_request: Request, response: Response) => {
    response.status(200).json({
      status: 'ok',
      service: 'EcoTrack API',
      timestamp: new Date().toISOString(),
    });
  });

  await app.listen(port, host);
  const displayHost = host === '0.0.0.0' ? 'localhost' : host;
  NestLogger.log(`API listening on http://${displayHost}:${port}/api`, 'Bootstrap');
}

bootstrap().catch((error) => {
  NestLogger.error('Failed to bootstrap API', error);
  process.exitCode = 1;
});
