import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import dotenv from 'dotenv';
import type { Request } from 'express';
import { LoggerModule } from 'nestjs-pino';
import type { Options as PinoHttpOptions } from 'pino-http';

import { AdminModule } from './admin/admin.module.js';
import { AuthModule } from './auth/auth.module.js';
import { getRequestIdFromRequest } from './common/request-id.js';
import configuration from './config/configuration.js';
import { validateEnv } from './config/validation.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { HotelsModule } from './hotels/hotels.module.js';
import { MonitoringModule } from './monitoring/monitoring.module.js';
import { TicketsModule } from './tickets/tickets.module.js';

const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 120;
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

const workspaceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootEnvPath = path.resolve(workspaceDir, '..', '.env');
const envFilePath = fs.existsSync(rootEnvPath) ? rootEnvPath : undefined;

if (envFilePath) {
  dotenv.config({ path: envFilePath });
}

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

const shouldIgnoreLogPath = (rawUrl?: string): boolean => {
  if (!rawUrl) {
    return false;
  }

  const pathOnly = normalizeRequestPath(rawUrl);
  return pathOnly === '/health' || pathOnly === '/api/metrics' || pathOnly.startsWith('/api/health');
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
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
    HotelsModule,
    DashboardModule,
    AdminModule,
    MonitoringModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
