import 'reflect-metadata';
import { Logger as NestLogger, ValidationPipe, type LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { requestIdMiddleware } from './common/middleware/request-id.middleware.js';
import { traceContextMiddleware } from './common/middleware/trace-context.middleware.js';
import { resolveCorsOrigins } from './config/cors-origins.js';
import { HealthService } from './modules/health/health.service.js';
import { attachRootHealthRoutes } from './modules/health/root-health-routes.js';

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

  app.use(traceContextMiddleware);
  app.use(requestIdMiddleware);
  app.use(json({ limit: '5mb' }));
  app.use(
    urlencoded({
      extended: true,
      limit: '5mb',
    }),
  );
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

  const port = Number(process.env.API_PORT ?? 3001);
  const host = process.env.API_HOST ?? '0.0.0.0';
  const origins = resolveCorsOrigins({
    corsOrigins: process.env.CORS_ORIGINS,
    clientOrigin: process.env.CLIENT_ORIGIN,
    nodeEnv: process.env.NODE_ENV,
  });

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  const expressApp = app.getHttpAdapter().getInstance();
  // Trust the immediate frontend edge proxy so client IP/proto metadata stays accurate.
  expressApp.set('trust proxy', 1);
  attachRootHealthRoutes(expressApp, app.get(HealthService));

  await app.listen(port, host);
  const displayHost = host === '0.0.0.0' ? 'localhost' : host;
  NestLogger.log(`API listening on http://${displayHost}:${port}/api`, 'Bootstrap');
}

bootstrap().catch((error) => {
  // Ensure startup failures are visible even when Nest logger levels are reduced.
  console.error('[Bootstrap] Failed to bootstrap API', error);
  NestLogger.error('Failed to bootstrap API', error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
