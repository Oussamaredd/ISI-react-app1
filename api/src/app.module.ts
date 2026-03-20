import { randomUUID } from 'node:crypto';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Request } from 'express';
import { LoggerModule } from 'nestjs-pino';
import type { Options as PinoHttpOptions } from 'pino-http';

import { getRequestIdFromRequest } from './common/request-id.js';
import { resolveTraceContext } from './common/trace-context.js';
import configuration from './config/configuration.js';
import { apiEnvFilePath, ensureApiEnvLoaded } from './config/env-file.js';
import {
  DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
} from './config/rate-limit.js';
import { validateEnv } from './config/validation.js';
import { DatabaseModule } from './database/database.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { CitizenModule } from './modules/citizen/citizen.module.js';
import { ToursModule } from './modules/collections/tours.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { GamificationModule } from './modules/gamification/gamification.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ContainersModule } from './modules/iot/containers.module.js';
import { IngestionModule } from './modules/iot/ingestion/ingestion.module.js';
import { MonitoringModule } from './modules/monitoring/monitoring.module.js';
import { CitizenReportsModule } from './modules/reports/citizen-reports.module.js';
import { PlanningModule } from './modules/routes/planning.module.js';
import { TicketsModule } from './modules/tickets/tickets.module.js';
import { ZonesModule } from './modules/zones/zones.module.js';

const REDACTED_FIELDS = '[REDACTED]';
const LOG_LEVELS = new Set(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);
const SENSITIVE_LOG_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.headers["x-auth-token"]',
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.body.token',
  'req.body.accessToken',
  'req.body.refreshToken',
  'req.body.idToken',
  'req.body.clientSecret',
  'req.body.secret',
  'req.query.token',
  'req.query.accessToken',
  'req.query.refreshToken',
  'res.headers["set-cookie"]',
];

ensureApiEnvLoaded();

const toPositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveLogLevel = (value: unknown): string => {
  if (typeof value !== 'string') {
    return 'info';
  }

  const normalized = value.trim().toLowerCase();
  return LOG_LEVELS.has(normalized) ? normalized : 'info';
};

const normalizeRequestPath = (rawUrl?: string): string => {
  if (!rawUrl) {
    return '/';
  }

  const [pathOnly] = rawUrl.split('?');
  return pathOnly || '/';
};

const getRequestPath = (request: Request): string =>
  normalizeRequestPath((request as Request & { originalUrl?: string }).originalUrl ?? request.url);

type TraceAwareRequest = Request & {
  traceId?: string;
  spanId?: string;
  traceparent?: string;
  tracestate?: string;
};

const shouldIgnoreLogPath = (rawUrl?: string): boolean => {
  if (!rawUrl) {
    return false;
  }

  const pathOnly = normalizeRequestPath(rawUrl);
  return (
    pathOnly === '/health' ||
    pathOnly === '/healthz' ||
    pathOnly === '/startupz' ||
    pathOnly === '/readyz' ||
    pathOnly === '/api/metrics' ||
    pathOnly.startsWith('/api/health')
  );
};

const getResponseStatus = (rawResponse: unknown): number => {
  const statusCode = (rawResponse as { statusCode?: unknown })?.statusCode;
  if (typeof statusCode === 'number' && Number.isInteger(statusCode)) {
    return statusCode;
  }

  return 500;
};

const getDurationFromLogValue = (value: unknown): number | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const payload = value as Record<string, unknown>;
  const durationCandidate = payload.duration ?? payload.responseTime;
  return typeof durationCandidate === 'number' && Number.isFinite(durationCandidate)
    ? durationCandidate
    : undefined;
};

const resolveRequestLogMessage = (statusCode: number): 'request completed' | 'request failed' =>
  statusCode >= 400 ? 'request failed' : 'request completed';

const resolveRequestLogLevel = (statusCode: number, error?: unknown): 'error' | 'warn' | 'info' => {
  if (error || statusCode >= 500) {
    return 'error';
  }

  if (statusCode >= 400) {
    return 'warn';
  }

  return 'info';
};

const extractUserId = (request: Request): string | undefined => {
  const authUserCandidate = (request as Request & { authUser?: { id?: unknown } }).authUser?.id;
  if (typeof authUserCandidate === 'string' && authUserCandidate.trim().length > 0) {
    return authUserCandidate;
  }

  const userCandidate = (request as Request & { user?: { id?: unknown } }).user?.id;
  if (typeof userCandidate === 'string' && userCandidate.trim().length > 0) {
    return userCandidate;
  }

  return undefined;
};

const getTraceFields = (request: Request) => {
  const traceContext = resolveTraceContext(request as TraceAwareRequest);

  return {
    traceId: traceContext.traceId,
    spanId: traceContext.spanId,
  };
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: apiEnvFilePath,
      load: [configuration],
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const level = resolveLogLevel(configService.get('logging.level'));
        const logFormat = String(configService.get('logging.format') ?? 'json').toLowerCase();
        const nodeEnv = String(configService.get('nodeEnv') ?? process.env.NODE_ENV ?? 'development');

        const pinoHttp: PinoHttpOptions = {
          level,
          customLogLevel: (_rawRequest, rawResponse, error) =>
            resolveRequestLogLevel(getResponseStatus(rawResponse), error),
          quietReqLogger: true,
          quietResLogger: true,
          genReqId: (rawRequest) => {
            const request = rawRequest as Request;
            const requestId = getRequestIdFromRequest(request) ?? randomUUID();
            request.requestId = requestId;
            request.id = requestId;
            return requestId;
          },
          autoLogging: {
            ignore: (rawRequest) => {
              const request = rawRequest as Request;
              return shouldIgnoreLogPath(getRequestPath(request));
            },
          },
          customAttributeKeys: {
            reqId: 'requestId',
            responseTime: 'duration',
          },
          redact: {
            paths: SENSITIVE_LOG_PATHS,
            censor: REDACTED_FIELDS,
          },
          customSuccessMessage: (_rawRequest, rawResponse) =>
            resolveRequestLogMessage(getResponseStatus(rawResponse)),
          customSuccessObject: (rawRequest, rawResponse, value) => {
            const request = rawRequest as Request;
            const statusCode = getResponseStatus(rawResponse);
            return {
              method: request.method,
              path: getRequestPath(request),
              status: statusCode,
              duration: getDurationFromLogValue(value),
              userId: extractUserId(request) ?? null,
              ...getTraceFields(request),
            };
          },
          customErrorMessage: () => 'request failed',
          customErrorObject: (rawRequest, rawResponse, error, value) => {
            const request = rawRequest as Request;
            const statusCode = getResponseStatus(rawResponse);
            return {
              method: request.method,
              path: getRequestPath(request),
              status: statusCode,
              duration: getDurationFromLogValue(value),
              userId: extractUserId(request) ?? null,
              ...getTraceFields(request),
              ...(error ? { err: error } : {}),
            };
          },
        };

        if (logFormat === 'pretty' && nodeEnv !== 'production') {
          pinoHttp.transport = {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          };
        }

        return { pinoHttp };
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            limit: toPositiveInt(
              configService.get('api.rateLimit.maxRequests'),
              DEFAULT_RATE_LIMIT_MAX_REQUESTS,
            ),
            ttl: toPositiveInt(
              configService.get('api.rateLimit.windowMs'),
              DEFAULT_RATE_LIMIT_WINDOW_MS,
            ),
          },
        ],
      }),
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    TicketsModule,
    BillingModule,
    DashboardModule,
    AdminModule,
    MonitoringModule,
    PlanningModule,
    ZonesModule,
    ContainersModule,
    IngestionModule,
    ToursModule,
    CitizenModule,
    CitizenReportsModule,
    GamificationModule,
    AnalyticsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

