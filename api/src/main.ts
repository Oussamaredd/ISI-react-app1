import 'reflect-metadata';

import type { LogLevel } from '@nestjs/common';

import { ensureApiEnvLoaded } from './config/env-file.js';
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
      expressModule,
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
      import('express'),
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
    const { json, urlencoded } = expressModule;
    const helmet = helmetModule.default;
    const { Logger } = nestPino;
    const { AppModule } = appModuleImport;
    const { HttpExceptionFilter } = exceptionFilterImport;
    const { requestIdMiddleware } = requestIdMiddlewareImport;
    const { traceContextMiddleware } = traceContextMiddlewareImport;
    const { resolveCorsOrigins } = corsOriginsImport;
    const { HealthService } = healthServiceImport;
    const { attachRootHealthRoutes } = rootHealthRoutesImport;

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
    expressApp.set('trust proxy', 1);
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

    await app.listen(port, host);
    const displayHost = host === '0.0.0.0' ? 'localhost' : host;
    NestLogger.log(`API listening on http://${displayHost}:${port}/api`, 'Bootstrap');
  } catch (error) {
    await shutdownTelemetry();
    throw error;
  }
}

bootstrap().catch((error) => {
  console.error('[Bootstrap] Failed to bootstrap API', error);
  process.exitCode = 1;
});
