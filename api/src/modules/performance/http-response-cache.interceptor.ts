import { createHash } from 'node:crypto';

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { map, type Observable } from 'rxjs';

import {
  HTTP_RESPONSE_CACHE_METADATA,
  type HttpResponseCacheOptions,
} from './http-response-cache.decorator.js';

const DEFAULT_VARY = ['Accept-Encoding'];
const LAST_MODIFIED_CANDIDATE_KEYS = new Set([
  'createdAt',
  'created_at',
  'deliveredAt',
  'delivered_at',
  'lastMeasurementAt',
  'last_measurement_at',
  'readAt',
  'read_at',
  'reportedAt',
  'reported_at',
  'triggeredAt',
  'triggered_at',
  'updatedAt',
  'updated_at',
  'windowEnd',
  'window_end',
]);
const MAX_LAST_MODIFIED_NODES = 64;

const appendVaryHeader = (response: Response, varyValues: string[]) => {
  const existingHeader = response.getHeader('Vary');
  const existingValues =
    typeof existingHeader === 'string'
      ? existingHeader
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : [];

  const values = new Set<string>([...existingValues, ...varyValues]);
  response.setHeader('Vary', [...values].join(', '));
};

const extractLatestTimestamp = (value: unknown) => {
  const queue: unknown[] = [value];
  const timestamps: number[] = [];
  let visitedNodes = 0;

  while (queue.length > 0 && visitedNodes < MAX_LAST_MODIFIED_NODES) {
    visitedNodes += 1;
    const current = queue.shift();

    if (current instanceof Date) {
      const timeValue = current.valueOf();
      if (Number.isFinite(timeValue)) {
        timestamps.push(timeValue);
      }
      continue;
    }

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    if (!current || typeof current !== 'object') {
      continue;
    }

    for (const [key, nestedValue] of Object.entries(current)) {
      if (LAST_MODIFIED_CANDIDATE_KEYS.has(key)) {
        const parsedValue =
          nestedValue instanceof Date ? nestedValue.valueOf() : new Date(String(nestedValue)).valueOf();
        if (Number.isFinite(parsedValue)) {
          timestamps.push(parsedValue);
        }
      }

      if (typeof nestedValue === 'object' && nestedValue !== null) {
        queue.push(nestedValue);
      }
    }
  }

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps)).toUTCString();
};

@Injectable()
export class HttpResponseCacheInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector = new Reflector()) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options =
      this.reflector.getAllAndOverride<HttpResponseCacheOptions>(HTTP_RESPONSE_CACHE_METADATA, [
        context.getHandler(),
        context.getClass(),
      ]) ?? null;

    if (!options) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data) => {
        if (response.headersSent) {
          return data;
        }

        const serialized = typeof data === 'string' ? data : JSON.stringify(data ?? null);
        const etag = `W/"${createHash('sha256').update(serialized).digest('hex')}"`;
        const cacheControlDirectives = [
          options.scope ?? 'private',
          `max-age=${options.maxAgeSeconds}`,
        ];

        if (typeof options.staleWhileRevalidateSeconds === 'number') {
          cacheControlDirectives.push(
            `stale-while-revalidate=${Math.max(0, options.staleWhileRevalidateSeconds)}`,
          );
        }

        response.setHeader('Cache-Control', cacheControlDirectives.join(', '));
        response.setHeader('ETag', etag);

        if (typeof options.cdnMaxAgeSeconds === 'number') {
          const cdnDirectives = [
            'public',
            `max-age=${Math.max(0, options.cdnMaxAgeSeconds)}`,
          ];
          if (typeof options.staleWhileRevalidateSeconds === 'number') {
            cdnDirectives.push(
              `stale-while-revalidate=${Math.max(0, options.staleWhileRevalidateSeconds)}`,
            );
          }
          response.setHeader('CDN-Cache-Control', cdnDirectives.join(', '));
        }

        if (options.cacheTags?.length) {
          response.setHeader('Cache-Tag', options.cacheTags.join(','));
        }

        appendVaryHeader(response, [...DEFAULT_VARY, ...(options.vary ?? [])]);

        const lastModified =
          extractLatestTimestamp(data) ??
          (request.method === 'GET' ? new Date().toUTCString() : null);
        if (lastModified) {
          response.setHeader('Last-Modified', lastModified);
        }

        return data;
      }),
    );
  }
}
