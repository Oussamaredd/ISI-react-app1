import 'reflect-metadata';

import type { Server } from 'node:http';

import type { LogLevel } from '@nestjs/common';
import type { Request, Response } from 'express';

import { resolveApiPort } from './config/api-port.js';
import { ensureApiEnvLoaded } from './config/env-file.js';
import { buildLivenessPayload } from './modules/health/health.payloads.js';
import { startTelemetry } from './observability/tracing.js';

const resolveNestLoggerOption = (
  nodeEnv: string | undefined,
  logLevel: string | undefined,
): false | LogLevel[] => {
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
  ensureApiEnvLoaded();
  const port = resolveApiPort(process.env as Record<string, unknown>);
  const host = process.env.API_HOST ?? '0.0.0.0';
  const expressModule = await import('express');
  const expressFactory = expressModule.default;
  const expressApp = expressFactory();
  const { json, urlencoded } = expressModule;

  const writeLivenessResponse = (_request: Request, response: Response) => {
    response.status(200).json(buildLivenessPayload());
  };

  expressApp.set('trust proxy', 1);
  expressApp.get('/health', writeLivenessResponse);
  expressApp.get('/healthz', writeLivenessResponse);
  expressApp.get('/startupz', writeLivenessResponse);

  const server = await new Promise<Server>((resolve, reject) => {
    const nextServer = expressApp.listen(port, host, () => {
      nextServer.off('error', reject);
      resolve(nextServer);
    });
    nextServer.once('error', reject);
  });

  const telemetry = await startTelemetry(process.env);
  let telemetryShutdownRegistered = false;
  let telemetryShutdownStarted = false;

  const shutdownTelemetry = async () => {
    if (telemetryShutdownStarted) {
      return;
    }

    telemetryShutdownStarted = true;
    await telemetry.shutdown();
  };

  try {
    const [
      nestCommon,
      nestCore,
      platformExpressImport,
      compressionModule,
      helmetModule,
      nestPino,
      appModuleImport,
      exceptionFilterImport,
      requestIdMiddlewareImport,
      traceContextMiddlewareImport,
      corsOriginsImport,
      healthServiceImport,
      rootHealthRoutesImport,
    ] = await Promise.all([
      import('@nestjs/common'),
      import('@nestjs/core'),
      import('@nestjs/platform-express'),
      import('compression'),
      import('helmet'),
      import('nestjs-pino'),
      import('./app.module.js'),
      import('./common/filters/http-exception.filter.js'),
      import('./common/middleware/request-id.middleware.js'),
      import('./common/middleware/trace-context.middleware.js'),
      import('./config/cors-origins.js'),
      import('./modules/health/health.service.js'),
      import('./modules/health/root-health-routes.js'),
    ]);

    const { Logger: NestLogger, ValidationPipe } = nestCommon;
    const { NestFactory } = nestCore;
    const { ExpressAdapter } = platformExpressImport;
    const compression = compressionModule.default;
    const helmet = helmetModule.default;
    const { Logger } = nestPino;
    const { AppModule } = appModuleImport;
    const { HttpExceptionFilter } = exceptionFilterImport;
    const { requestIdMiddleware } = requestIdMiddlewareImport;
    const { traceContextMiddleware } = traceContextMiddlewareImport;
    const { resolveCorsOrigins } = corsOriginsImport;
    const { HealthService } = healthServiceImport;
    const { attachRootHealthRoutes } = rootHealthRoutesImport;
    const { shouldCompressResponse } = await import('./modules/performance/response-compression.js');

    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      {
        bufferLogs: true,
        logger: resolveNestLoggerOption(process.env.NODE_ENV, process.env.LOG_LEVEL),
      },
    );

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
        contentSecurityPolicy: false,
      }),
    );
    if (process.env.RESPONSE_COMPRESSION_ENABLED?.trim().toLowerCase() !== 'false') {
      const thresholdBytes = Number(process.env.RESPONSE_COMPRESSION_THRESHOLD_BYTES ?? 1024);
      const level = Number(process.env.RESPONSE_COMPRESSION_LEVEL ?? 6);
      app.use(
        compression({
          filter: (request, response) => {
            if (
              !shouldCompressResponse({
                acceptHeader: request.headers.accept,
                requestPath: request.originalUrl ?? request.url,
              })
            ) {
              return false;
            }

            return compression.filter(request, response);
          },
          level: Number.isInteger(level) && level >= -1 && level <= 9 ? level : 6,
          threshold: Number.isFinite(thresholdBytes) && thresholdBytes > 0 ? thresholdBytes : 1024,
        }),
      );
    }

    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    const origins = resolveCorsOrigins({
      corsOrigins: process.env.CORS_ORIGINS,
      clientOrigin: process.env.CLIENT_ORIGIN,
      nodeEnv: process.env.NODE_ENV,
    });

    app.enableCors({
      origin: origins,
      credentials: true,
    });

    attachRootHealthRoutes(expressApp, app.get(HealthService));

    if (!telemetryShutdownRegistered) {
      telemetryShutdownRegistered = true;
      process.once('SIGINT', () => {
        void shutdownTelemetry();
      });
      process.once('SIGTERM', () => {
        void shutdownTelemetry();
      });
      process.once('beforeExit', () => {
        void shutdownTelemetry();
      });
    }

    await app.init();
    const displayHost = host === '0.0.0.0' ? 'localhost' : host;
    NestLogger.log(`API listening on http://${displayHost}:${port}/api`, 'Bootstrap');
  } catch (error) {
    if (server.listening) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    await shutdownTelemetry();
    throw error;
  }
}

bootstrap().catch((error) => {
  console.error('[Bootstrap] Failed to bootstrap API', error);
  process.exitCode = 1;
});
